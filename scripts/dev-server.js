#!/usr/bin/env node
/* eslint-env node */
'use strict';

/**
 * Serve local Adiutor files for on-wiki debugging.
 *
 * Start with:
 *   npm start
 *   node scripts/dev-server.js --api-url https://xx.wikipedia.org/w/api.php \
 *     --username Bot --password 123
 *
 * Then add to your on-wiki common.js:
 *   mw.loader.load('http://127.0.0.1:5500');
 *
 * Pass --no-disable to skip automatically disabling the on-wiki gadget
 * (requires credentials and API URL to toggle gadget options).
 */

const http = require( 'http' );
const fs = require( 'fs/promises' );
const path = require( 'path' );

const hostname = '127.0.0.1';
const port = process.env.PORT || 5500;
const gadgetName = 'Adiutor';
const root = path.resolve( __dirname, '..' );

const args = parseArgs( process.argv.slice( 2 ) );
const apiUrl = args[ 'api-url' ] || process.env.ADIUTOR_API_URL;
const username = args.username || process.env.ADIUTOR_USERNAME;
const password = args.password || process.env.ADIUTOR_PASSWORD;
const disableRemoteGadget = !args[ 'no-disable' ];

function parseArgs( argv ) {
	return argv.reduce( ( acc, arg ) => {
		if ( !arg.startsWith( '--' ) ) {
			return acc;
		}
		const [ key, value ] = arg.slice( 2 ).split( '=' );
		acc[ key ] = value === undefined ? true : value;
		return acc;
	}, {} );
}

async function fileExists( filePath ) {
	try {
		await fs.access( filePath );
		return true;
	} catch ( err ) {
		return false;
	}
}

async function readFiles( filePaths ) {
	return Promise.all( filePaths.map( async ( relativePath ) => {
		const fullPath = path.join( root, relativePath );
		// eslint-disable-next-line security/detect-non-literal-fs-filename
		const blob = await fs.readFile( fullPath, 'utf8' );
		return blob.toString();
	} ) );
}

async function buildClientBundle() {
	const moduleDir = path.join( root, 'src' );
	const moduleFiles = ( await fs.readdir( moduleDir ) ).filter( ( name ) => name.endsWith( '.js' ) );

	const mainIndex = moduleFiles.indexOf( 'adiutor.js' );
	if ( mainIndex !== -1 ) {
		moduleFiles.splice( mainIndex, 1 );
	}

	const jsFiles = [ 'src/adiutor.js' ].concat( moduleFiles.sort().map( ( name ) => 'src/' + name ) );
	const cssFiles = [];

	if ( await fileExists( path.join( moduleDir, 'adiutor.css' ) ) ) {
		cssFiles.push( 'src/adiutor.css' );
	}

	const dependencies = [
		'mediawiki.api',
		'mediawiki.user',
		'mediawiki.util',
		'oojs-ui-core',
		'oojs-ui-windows',
		'oojs-ui-widgets',
		'oojs-ui-toolbars',
		'oojs-ui.styles.icons-interactions',
		'oojs-ui.styles.icons-movement',
		'oojs-ui.styles.icons-content',
		'oojs-ui.styles.icons-moderation',
		'oojs-ui.styles.icons-editing-core',
		'oojs-ui.styles.icons-layout',
		'oojs-ui.styles.icons-user',
		'oojs-ui.styles.icons-media',
		'oojs-ui.styles.icons-editing-advanced'
	];

	let jsCode = `mw.loader.using(${ JSON.stringify( dependencies ) }).then(function () {\n`;

	const [ scripts, styles ] = await Promise.all( [
		readFiles( jsFiles ),
		readFiles( cssFiles )
	] );

	for ( const script of scripts ) {
		jsCode += script + '\n';
	}

	for ( const stylesheet of styles ) {
		const css = JSON.stringify( stylesheet.replace( /\s+/g, ' ' ) );
		jsCode += `mw.loader.addStyleTag(${ css });\n`;
	}

	jsCode += "console.log('Loaded debug version of Adiutor.');\n";
	jsCode += '});';

	return jsCode;
}

const server = http.createServer( async ( request, response ) => {
	try {
		const payload = await buildClientBundle();
		response.writeHead( 200, { 'Content-Type': 'text/javascript; charset=utf-8' } );
		response.end( payload, 'utf-8' );
	} catch ( err ) {
		response.writeHead( 500, { 'Content-Type': 'text/plain; charset=utf-8' } );
		response.end( 'Error: ' + err.message );
	}
} );

server.listen( port, hostname, async () => {
	console.log( `Server running at http://${ hostname }:${ port }/` );
	console.log(
		'Add "mw.loader.load(\'http://' + hostname + ':' + port +
			'\');" to your on-wiki common.js to test the local build.'
	);

	if ( !disableRemoteGadget ) {
		return;
	}

	if ( !apiUrl || !username || !password ) {
		console.log(
			'To temporarily disable the on-wiki gadget while testing, provide --api-url, ' +
				'--username, and --password or set ADIUTOR_API_URL/ADIUTOR_USERNAME/' +
				'ADIUTOR_PASSWORD.'
		);
		return;
	}

	let bot;
	const { mwn } = require( 'mwn' );
	try {
		bot = await mwn.init( {
			apiUrl,
			username,
			password,
			silent: true,
			userAgent: 'Adiutor dev server'
		} );
	} catch ( err ) {
		console.log( `[mwn] Could not log in to disable on-wiki gadget: ${ err }` );
		return;
	}

	try {
		await bot.saveOption( 'gadget-' + gadgetName, '0' );
		console.log( `[i] Disabled ${ gadgetName } gadget for this account.` );
	} catch ( err ) {
		console.log( `[mwn] Failed to disable gadget: ${ err }` );
	}

	// Allow async operations in exit hook
	process.stdin.resume();

	process.on( 'SIGINT', async () => {
		try {
			await bot.getTokens();
			await bot.saveOption( 'gadget-' + gadgetName, '1' );
			console.log( `[i] Re-enabled ${ gadgetName } gadget.` );
		} catch ( err ) {
			console.log( `[mwn] Failed to re-enable gadget: ${ err }` );
		} finally {
			process.exit();
		}
	} );
} );
