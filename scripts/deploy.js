#!/usr/bin/env node
'use strict';
/**
 * Sync Adiutor gadget files to a target wiki using mwn.
 *
 * Usage examples:
 *   node scripts/deploy.js --api-url https://en.wikipedia.org/w/api.php \
 *     --username MyBot --password Secret
 *   node scripts/deploy.js --definition --dry-run --only adiutor.js,adiutor.css
 *
 * Environment variables can be used instead of CLI flags:
 *   ADIUTOR_API_URL, ADIUTOR_USERNAME, ADIUTOR_PASSWORD, ADIUTOR_USER_AGENT,
 *   ADIUTOR_GADGET_PREFIX, ADIUTOR_DEPLOY_SUMMARY, ADIUTOR_DEFINITION_SUMMARY,
 *   ADIUTOR_GADGET_DEFINITION, ADIUTOR_DRY_RUN
 */
const fs = require( 'fs' );
const path = require( 'path' );
const { mwn } = require( 'mwn' );

const ROOT = path.resolve( __dirname, '..' );
const args = parseArgs( process.argv.slice( 2 ) );

const apiUrl = args[ 'api-url' ] || process.env.ADIUTOR_API_URL;
const username = args.username || process.env.ADIUTOR_USERNAME;
const password = args.password || process.env.ADIUTOR_PASSWORD;
const userAgent = process.env.ADIUTOR_USER_AGENT ||
	'Adiutor deployer (+https://meta.wikimedia.org/wiki/Adiutor)';
const gadgetPrefix = args.prefix || process.env.ADIUTOR_GADGET_PREFIX || 'MediaWiki:Gadget-';
const baseSummary = args.summary ||
	process.env.ADIUTOR_DEPLOY_SUMMARY ||
	'Update Adiutor gadget files';
const definitionSummary = args[ 'definition-summary' ] ||
	process.env.ADIUTOR_DEFINITION_SUMMARY ||
	'Update Adiutor gadget definition entry';
const definitionTitle = args[ 'definition-title' ] ||
	process.env.ADIUTOR_GADGET_DEFINITION ||
	'MediaWiki:Gadgets-definition';
const includeDefinition = Boolean( args.definition || args[ 'gadgets-definition' ] );
const dryRun = Boolean( args[ 'dry-run' ] || process.env.ADIUTOR_DRY_RUN );
const onlyFiles = ( args.only || '' ).split( ',' ).map( ( item ) => item.trim() ).filter( Boolean );

if ( args.help ) {
	printHelp();
	process.exit( 0 );
}

if ( !apiUrl || !username || !password ) {
	console.error(
		'Missing required auth information. Provide --api-url, --username, ' +
			'and --password or set ADIUTOR_API_URL, ADIUTOR_USERNAME, ' +
			'ADIUTOR_PASSWORD.'
	);
	process.exit( 1 );
}

const pagesToSync = collectModulePages();

if ( !pagesToSync.length ) {
	console.log( 'No gadget files found to deploy.' );
	process.exit( 0 );
}

( async () => {
	const bot = await mwn.init( {
		apiUrl,
		username,
		password,
		userAgent,
		defaultParams: {
			format: 'json',
			formatversion: '2',
			assert: 'user'
		}
	} );

	for ( const page of pagesToSync ) {
		const absolutePath = path.join( ROOT, page.file );
		// eslint-disable-next-line security/detect-non-literal-fs-filename -- Controlled module path.
		const content = fs.readFileSync( absolutePath, 'utf8' );
		const summary = `${ baseSummary } (${ path.basename( page.file ) })`;

		if ( dryRun ) {
			console.log( `[dry-run] ${ absolutePath } -> ${ page.title }` );
			continue;
		}

		await bot.save( page.title, content, summary, {
			contentmodel: page.contentModel
		} );
		console.log( `Synced ${ absolutePath } -> ${ page.title }` );
	}

	if ( includeDefinition ) {
		await syncGadgetDefinition( bot );
	}

	console.log( dryRun ? 'Dry run complete.' : 'Deployment complete.' );
} )().catch( ( err ) => {
	console.error( 'Deployment failed:', err );
	process.exit( 1 );
} );

function collectModulePages() {
	const moduleDir = path.join( ROOT, 'src' );
	const allowedExts = new Set( [ '.js', '.json', '.css' ] );

	return fs.readdirSync( moduleDir )
		.filter( ( name ) => allowedExts.has( path.extname( name ) ) )
		.filter( ( name ) => !onlyFiles.length || onlyFiles.includes( name ) )
		.map( ( name ) => ( {
			file: path.join( 'src', name ),
			title: `${ gadgetPrefix }${ name }`,
			contentModel: contentModelForExtension( name )
		} ) );
}

async function syncGadgetDefinition( bot ) {
	const gadgetDefinitionPath = path.join( ROOT, 'gadget.txt' );

	if ( !fs.existsSync( gadgetDefinitionPath ) ) {
		console.warn( 'gadget.txt is missing; skipping gadget definition sync.' );
		return;
	}

	const newLine = fs.readFileSync( gadgetDefinitionPath, 'utf8' ).trim();
	const target = definitionTitle;
	const definitionRegex = /^\s*\*\s*Adiutor\[[^\n]*$/m;

	let currentContent = '';

	try {
		const page = await bot.read( target );
		const revision = page.revisions && page.revisions[ 0 ];
		currentContent = ( revision && revision.content ) || '';
	} catch ( err ) {
		console.warn(
			`Unable to read ${ target }; the page will be created if it does not exist.`,
			err.message
		);
	}

	let updatedContent;
	if ( definitionRegex.test( currentContent ) ) {
		updatedContent = currentContent.replace( definitionRegex, newLine );
	} else if ( currentContent ) {
		updatedContent = `${ currentContent.trim() }\n${ newLine }\n`;
	} else {
		updatedContent = `${ newLine }\n`;
	}

	if ( dryRun ) {
		console.log( `[dry-run] Update ${ target } with Adiutor gadget definition line.` );
		return;
	}

	await bot.save( target, updatedContent, definitionSummary );
	console.log( `Updated gadget definition at ${ target }` );
}

function contentModelForExtension( filename ) {
	const ext = path.extname( filename ).toLowerCase();

	if ( ext === '.js' ) {
		return 'javascript';
	}
	if ( ext === '.json' ) {
		return 'json';
	}
	if ( ext === '.css' ) {
		return 'css';
	}
	return 'wikitext';
}

function parseArgs( argv ) {
	const parsed = {};

	for ( let i = 0; i < argv.length; i++ ) {
		const arg = argv[ i ];

		if ( !arg.startsWith( '--' ) ) {
			continue;
		}

		const withoutPrefix = arg.slice( 2 );

		if ( withoutPrefix.includes( '=' ) ) {
			const [ key, ...rest ] = withoutPrefix.split( '=' );
			parsed[ key ] = rest.join( '=' );
			continue;
		}

		const next = argv[ i + 1 ];
		if ( next && !next.startsWith( '--' ) ) {
			parsed[ withoutPrefix ] = next;
			i++;
		} else {
			parsed[ withoutPrefix ] = true;
		}
	}

	return parsed;
}

function printHelp() {
	console.log( `
Adiutor deploy script
---------------------
Flags:
  --api-url <url>            Target wiki api.php URL (or set ADIUTOR_API_URL)
  --username <name>          Bot username (or set ADIUTOR_USERNAME)
  --password <password>      Bot password (or set ADIUTOR_PASSWORD)
  --summary <text>           Base edit summary (default: "Update Adiutor gadget files")
  --prefix <text>            Page prefix (default: "MediaWiki:Gadget-")
  --only <files>             Comma-separated list of filenames to sync
  --definition               Also update MediaWiki:Gadgets-definition
  --definition-title <page>  Override gadgets-definition page title
  --definition-summary <txt> Summary for gadgets-definition edit
  --dry-run                  Print actions without editing
  --help                     Show this help text
` );
}
