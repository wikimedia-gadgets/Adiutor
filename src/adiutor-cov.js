/* <nowiki> */

/**
 * @file adiutor-cov.js
 * @description Copyright violation checker module using Earwig’s Copyvio Detector API.
 * @license CC BY-SA 4.0
 */

( function () {
	'use strict';

	/**
	 * Open copyvio checker dialog.
	 *
	 * @return {void}
	 */
	function callBack() {
		const mwConfig = {
			wgPageName: /** @type {string} */ ( mw.config.get( 'wgPageName' ) )
		};

		const wgContentLanguage = mw.config.get( 'wgContentLanguage' );
		const messageDialog = new OO.ui.MessageDialog();
		const windowManager = new OO.ui.WindowManager();
		$( document.body ).append( windowManager.$element );
		windowManager.addWindows( [ messageDialog ] );
		const progressBar = new OO.ui.ProgressBarWidget( {
			progress: false
		} );
		windowManager.openWindow( messageDialog, {
			title: mw.msg( 'copyvio-checking' ),
			message: progressBar.$element
		} );

		$.get( 'https://copyvios.toolforge.org/api.json?', {
			action: 'search',
			lang: wgContentLanguage,
			project: 'wikipedia',
			title: mwConfig.wgPageName,
			oldid: '',
			use_engine: '1',
			use_links: '1',
			turnitin: '0'
		} ).then( ( data ) => {
			messageDialog.close();

			function CopyVioDialog( config ) {
				CopyVioDialog.super.call( this, config );
			}

			OO.inheritClass( CopyVioDialog, OO.ui.ProcessDialog );
			const copyVioRatio = ( data.best.confidence * 100 ).toFixed( 2 );
			CopyVioDialog.static.title = mw.msg( 'copyvio-result', copyVioRatio );
			CopyVioDialog.static.name = 'CopyVioDialog';
			let headerTitle;
			if ( copyVioRatio > 45 ) {
				headerTitle = new OO.ui.MessageWidget( {
					type: 'error',
					inline: true,
					label: mw.msg( 'copyvio-potential-violation', copyVioRatio )
				} );
				CopyVioDialog.static.actions = [ {
					action: 'continue',
					modes: 'edit',
					label: mw.msg( 'create-speedy-deletion-request' ),
					flags: [ 'primary', 'destructive' ]
				}, {
					modes: 'edit',
					label: mw.msg( 'close' ),
					flags: 'safe'
				}, {
					action: 'analysis',
					modes: 'edit',
					label: mw.msg( 'detailed-analysis' ),
					framed: false
				} ];
			} else if ( copyVioRatio < 10 ) {
				headerTitle = new OO.ui.MessageWidget( {
					type: 'success',
					inline: true,
					label: mw.msg( 'copyvio-potential-violation', copyVioRatio )
				} );
				CopyVioDialog.static.actions = [ {
					action: 'close',
					modes: 'edit',
					label: mw.msg( 'okay' ),
					flags: [ 'primary', 'progressive' ]
				}, {
					modes: 'edit',
					label: mw.msg( 'close' ),
					flags: 'safe'
				}, {
					action: 'analysis',
					modes: 'edit',
					label: mw.msg( 'detailed-analysis' ),
					framed: false
				} ];
			} else {
				headerTitle = new OO.ui.MessageWidget( {
					type: 'warning',
					inline: true,
					label: mw.msg( 'copyvio-potential-violation-low', copyVioRatio )
				} );
				CopyVioDialog.static.actions = [ {
					action: 'close',
					modes: 'edit',
					label: mw.msg( 'okay' ),
					flags: [ 'primary', 'progressive' ]
				}, {
					modes: 'edit',
					label: mw.msg( 'close' ),
					flags: 'safe'
				}, {
					action: 'analysis',
					modes: 'edit',
					label: mw.msg( 'detailed-analysis' ),
					framed: false
				} ];
			}
			CopyVioDialog.prototype.initialize = function () {
				CopyVioDialog.super.prototype.initialize.apply( this, arguments );
				const relevantSources = data.sources.filter( ( source ) => !source.excluded );
				const copyVioLinks = relevantSources.map( ( source ) => {
					const messageWidgetConfig = {
						icon: 'link',
						label: new OO.ui.HtmlSnippet(
							'<a target="_blank" href="' + source.url + '">' +
									source.url + '</a>'
						)
					};
					if ( ( source.confidence * 100 ).toFixed( 2 ) > 40 ) {
						messageWidgetConfig.type = 'error';
						const confidence = ( source.confidence * 100 ).toFixed( 2 );
						messageWidgetConfig.label = new OO.ui.HtmlSnippet(
							'<strong>' + mw.msg( 'high-violation-link' ) +
									' (' + confidence + ')</strong><br>' +
									'<a target="_blank" href="' + source.url + '">' +
									source.url + '</a>'
						);
					} else {
						messageWidgetConfig.type = 'notice';
					}
					return new OO.ui.MessageWidget( messageWidgetConfig );
				} );
				this.panel1 = new OO.ui.PanelLayout( {
					padded: true,
					expanded: false
				} );
				this.panel1.$element.append( headerTitle.$element );
				copyVioLinks.forEach( function ( link ) {
					this.panel1.$element.append( link.$element );
				}, this );
				this.$body.append( this.panel1.$element );
			};
			CopyVioDialog.prototype.getSetupProcess = function ( dialogData ) {
				return CopyVioDialog.super.prototype.getSetupProcess
					.call( this, dialogData )
					.next( function () {
						this.actions.setMode( 'edit' );
					}, this );
			};
			CopyVioDialog.prototype.getActionProcess = function ( action ) {
				if ( action === 'continue' ) {
					return new OO.ui.Process( () => {
						this.close();
						mw.loader.load( mw.util.getUrl( 'MediaWiki:Gadget-adiutor-csd.js', {
							action: 'raw'
						} ) + '&ctype=text/javascript', 'text/javascript' );
					} );
				} else if ( action === 'analysis' ) {
					const targetURL = 'https://copyvios.toolforge.org/?lang=' +
							wgContentLanguage + '&project=wikipedia&title=' +
							mwConfig.wgPageName;
					window.open( targetURL, '_blank' );
				} else if ( action === 'close' ) {
					this.close();
				}
				return CopyVioDialog.super.prototype.getActionProcess.call( this, action );
			};
			const windowManagerInner = new OO.ui.WindowManager();
			$( document.body ).append( windowManagerInner.$element );
			const dialog = new CopyVioDialog( {
				size: 'larger'
			} );
			windowManagerInner.addWindows( [ dialog ] );
			windowManagerInner.openWindow( dialog );
		} ).catch( () => {
			messageDialog.close();
			mw.notify( mw.msg( 'operation-failed' ), {
				title: mw.msg( 'error' ),
				type: 'error'
			} );
		} );
	}

	module.exports = {
		callBack: callBack
	};
}() );

/* </nowiki> */
