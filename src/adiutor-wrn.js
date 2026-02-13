/* <nowiki> */

/**
 * @file adiutor-wrn.js
 * @description User warning module for issuing standard warning messages via Adiutor.
 * @license CC BY-SA 4.0
 */

( function () {
	'use strict';

	/**
	 * Open user warning dialog.
	 *
	 * @return {void}
	 */
	function callBack() {
		/** @type {mw.Api} */
		const api = new mw.Api();
		const wikiId = /** @type {string} */ ( mw.config.get( 'wgWikiID' ) );
		const adiutorUserOptions = JSON.parse(
			mw.user.options.get( 'userjs-adiutor-' + wikiId ) || '{}'
		);

		const mwConfig = {
			wgPageName: /** @type {string} */ ( mw.config.get( 'wgPageName' ) ),
			wgNamespaceNumber: /** @type {number} */ ( mw.config.get( 'wgNamespaceNumber' ) )
		};
		const changeTags = mw.config.get( 'wgChangeTags' ) || [];
		const tagParams = Array.isArray( changeTags ) && changeTags.includes( 'Adiutor' ) ?
			{ tags: 'Adiutor' } :
			{};

		/**
		 * @typedef {Object} WrnConfiguration
		 * @property {{ title: string, label: string, body: string }[]} userWarnings
		 * @property {string} apiPostSummary
		 * @property {string} warningMessageTitle
		 * @property {string} userPagePrefix
		 * @property {string} userTalkPagePrefix
		 * @property {string} specialContributions
		 */

		/** @type {WrnConfiguration} */
		const wrnConfiguration = require( './adiutor-wrn.json' );

		if ( !wrnConfiguration ) {
			mw.notify( 'MediaWiki:Gadget-adiutor-wrn.json data is empty or undefined.', {
				title: mw.msg( 'operation-failed' ),
				type: 'error'
			} );
			return;
		}

		let warningData;
		const userWarnings = wrnConfiguration.userWarnings;
		const apiPostSummary = wrnConfiguration.apiPostSummary;
		const warningMessageTitle = wrnConfiguration.warningMessageTitle;
		const userPagePrefix = wrnConfiguration.userPagePrefix;
		const userTalkPagePrefix = wrnConfiguration.userTalkPagePrefix;
		const specialContributions = wrnConfiguration.specialContributions;
		const userWarned = userTalkPagePrefix + mwConfig.wgPageName
			.replace( /_/g, ' ' )
			.replace( userPagePrefix, '' )
			.replace( specialContributions, '' )
			.replace( userTalkPagePrefix, '' );

		let relatedPageField;
		let relatedPageInput;
		let warningLevelInput;

		function UserWarningDialog( config ) {
			UserWarningDialog.super.call( this, config );
		}

		OO.inheritClass( UserWarningDialog, OO.ui.ProcessDialog );
		UserWarningDialog.static.name = 'UserWarningDialog';
		UserWarningDialog.static.title = OO.ui.deferMsg( 'wrn-module-title' );
		UserWarningDialog.static.actions = [ {
			action: 'save',
			label: OO.ui.deferMsg( 'warn' ),
			flags: [ 'primary', 'progressive' ],
			id: 'warn-button'
		}, {
			label: OO.ui.deferMsg( 'cancel' ),
			flags: 'safe'
		} ];

		UserWarningDialog.prototype.initialize = function () {
			UserWarningDialog.super.prototype.initialize.apply( this, arguments );
			const headerTitle = new OO.ui.MessageWidget( {
				type: 'notice',
				inline: true,
				label: OO.ui.deferMsg( 'wrn-dialog-description' )
			} );
			headerTitle.$element.css( 'margin-top', '20px' );
			const rationaleSelector = new OO.ui.DropdownWidget( {
				menu: {
					items: userWarnings.map( ( warning ) => new OO.ui.MenuOptionWidget( {
						data: warning,
						label: warning.label
					} ) )
				},
				label: OO.ui.deferMsg( 'warning-type' )
			} );
			rationaleSelector.getMenu().on( 'choose', ( menuOption ) => {
				warningData = menuOption.getData();
			} );
			rationaleSelector.$element.css( 'margin-top', '20px' );
			relatedPageInput = new OO.ui.TextInputWidget( {
				value: '',
				required: true
			} );
			relatedPageField = new OO.ui.FieldLayout( relatedPageInput, {
				label: OO.ui.deferMsg( 'related-page' ),
				help: OO.ui.deferMsg( 'wrn-related-page-help' )
			} );
			this.content = new OO.ui.PanelLayout( {
				padded: true,
				expanded: false
			} );
			warningLevelInput = new OO.ui.RadioSelectInputWidget( {
				options: [ {
					data: 1,
					label: OO.ui.deferMsg( 'wrn-user-mildly' )
				}, {
					data: 2,
					label: OO.ui.deferMsg( 'wrn-user-seriously' )
				}, {
					data: 3,
					label: OO.ui.deferMsg( 'wrn-user-sternly' )
				} ]
			} );
			relatedPageField.$element.css( {
				'margin-top': '20px',
				'margin-bottom': '20px'
			} );
			this.content.$element.append(
				headerTitle.$element,
				rationaleSelector.$element,
				relatedPageField.$element,
				warningLevelInput.$element
			);
			this.$body.append( this.content.$element );
		};

		UserWarningDialog.prototype.getActionProcess = function ( action ) {
			if ( action === 'save' ) {
				if ( relatedPageInput.getValue() === '' || !warningData ) {
					if ( !relatedPageInput.getValue() ) {
						mw.notify( mw.message( 'related-page-required' ).text(), {
							title: mw.msg( 'operation-failed' ),
							type: 'error'
						} );
					} else {
						mw.notify( mw.message( 'warning-required' ).text(), {
							title: mw.msg( 'operation-failed' ),
							type: 'error'
						} );
					}
				} else {
					return new OO.ui.Process( () => warnUser( warningData )
						.then( () => {
							this.close( {
								action: action
							} );
						} )
						.catch( ( error ) => {
							let errorText = mw.msg( 'operation-failed' );
							if ( Array.isArray( error ) && error[ 0 ] && error[ 0 ].text ) {
								errorText = error[ 0 ].text;
							} else if ( error && error.error && error.error.info ) {
								errorText = error.error.info;
							} else if ( error && error.message ) {
								errorText = error.message;
							}
							throw new OO.ui.Error( errorText, { recoverable: false } );
						} ) );
				}
			}
			return UserWarningDialog.super.prototype.getActionProcess.call( this, action );
		};

		const windowManager = new OO.ui.WindowManager();
		$( document.body ).append( windowManager.$element );
		const dialog = new UserWarningDialog();
		windowManager.addWindows( [ dialog ] );
		windowManager.openWindow( dialog );

		function warnUser( warningPayload ) {
			const warningText = '{{subst:ADT-WT|' +
				warningLevelInput.getValue() + '|' + warningPayload.title + '|' +
				replaceParameter(
					warningPayload.body,
					'1',
					relatedPageInput.getValue()
				) + '|~~~~}}';
			return api.postWithEditToken( Object.assign( {
				action: 'edit',
				title: userWarned,
				section: 'new',
				sectiontitle: warningMessageTitle,
				text: warningText,
				summary: apiPostSummary,
				watchlist: 'unwatch',
				format: 'json'
			}, tagParams ) ).then( () => {
				window.location = '/wiki/' + userWarned;
				adiutorUserOptions.stats.userWarnings++;
				return api.postWithEditToken( {
					action: 'globalpreferences',
					format: 'json',
					optionname: 'userjs-adiutor-' + mw.config.get( 'wgWikiID' ),
					optionvalue: JSON.stringify( adiutorUserOptions ),
					formatversion: 2
				} );
			} );
		}

		function replaceParameter( input, parameterName, newValue ) {
			const regex = new RegExp( '\\$' + parameterName, 'g' );
			if ( input.includes( '$' + parameterName ) ) {
				return input.replace( regex, newValue );
			}
			return input;
		}
	}

	module.exports = {
		callBack: callBack
	};
}() );

/* </nowiki> */
