/* <nowiki> */

/**
 * @file adiutor-cmr.js
 * @description Canned mentor responses module for quickly replying to newcomers via Adiutor.
 * @license CC BY-SA 4.0
 */

( function () {
	'use strict';

	/**
	 * Attach canned response UI to section edit links.
	 *
	 * @return {void}
	 */
	function callBack() {
		/** @type {mw.Api} */
		const api = new mw.Api();

		/**
		 * @typedef {Object} CmrConfiguration
		 * @property {Array<{
		 *   label: string,
		 *   options: Array<{ data: string, label: string }>
		 * }>} predefinedResponses
		 * @property {string} apiPostSummary
		 */

		/** @type {CmrConfiguration} */
		const cmrConfiguration = require( './adiutor-cmr.json' );

		if ( !cmrConfiguration ) {
			mw.notify( 'MediaWiki:Gadget-adiutor-cmr.json data is empty or undefined.', {
				title: mw.msg( 'operation-failed' ),
				type: 'error'
			} );
			return;
		}

		let sectionNumber;
		let mentorResponse = '';
		const predefinedResponses = cmrConfiguration.predefinedResponses;
		const apiPostSummary = cmrConfiguration.apiPostSummary;
		const $body = $( document.body );

		const cannedResponseButton = new OO.ui.ButtonWidget( {
			framed: false,
			label: '[' + mw.msg( 'cmr-canned-response' ) + ']',
			classes: [ 'adiutor-canned-response-button' ]
		} );

		$body.find( '.mw-editsection' ).append( cannedResponseButton.$element );
		$body.find( '.adiutor-canned-response-button' ).on( 'click', function () {
			const $buttonElement = $( this );
			const sectionPath = $buttonElement.parent().parent()[ 0 ];
			const sectionLink = clearURLfromOrigin(
				sectionPath.querySelector( '.mw-editsection a' ).getAttribute( 'href' )
			);
			const match = sectionLink.match( /[?&]section=(\d+)/ );
			if ( match ) {
				sectionNumber = match[ 1 ];
			}
			openCmrDialog();
		} );

		function openCmrDialog() {
			function CannedResponseDialog( config ) {
				CannedResponseDialog.super.call( this, config );
			}

			OO.inheritClass( CannedResponseDialog, OO.ui.ProcessDialog );
			CannedResponseDialog.static.name = 'CannedResponseDialog';
			CannedResponseDialog.static.title = mw.msg( 'cmr-module-title' );
			CannedResponseDialog.static.actions = [ {
				action: 'save',
				label: mw.msg( 'cmr-response' ),
				flags: 'primary'
			}, {
				label: mw.msg( 'cancel' ),
				flags: 'safe'
			} ];

			const dialogWindowManager = new OO.ui.WindowManager();
			$( document.body ).append( dialogWindowManager.$element );

			CannedResponseDialog.prototype.initialize = function () {
				CannedResponseDialog.super.prototype.initialize.apply( this, arguments );

				const menuItems = predefinedResponses.reduce( ( items, group ) => {
					const groupItems = group.options.map( ( option ) => new OO.ui.MenuOptionWidget(
						{
							data: option.data,
							label: option.label
						}
					) );
					return items.concat( [ new OO.ui.MenuSectionOptionWidget( {
						label: group.label
					} ) ], groupItems );
				}, [] );

				const dropdown = new OO.ui.DropdownWidget( {
					label: mw.msg( 'cmr-choose-answer' ),
					menu: {
						items: menuItems
					}
				} );
				const headerMessage = new OO.ui.MessageWidget( {
					type: 'notice',
					inline: true,
					label: new OO.ui.HtmlSnippet(
						'<strong>' + mw.msg( 'cmr-header-title' ) +
						'</strong><br><small>' + mw.msg( 'cmr-header-description' ) +
						'</small>'
					)
				} );
				headerMessage.$element.css( {
					'margin-top': '20px',
					'margin-bottom': '20px'
				} );

				this.content = new OO.ui.PanelLayout( {
					padded: true,
					expanded: false
				} );
				const previewArea = new OO.ui.Element( {
					text: '',
					classes: [ 'adiutor-mentor-response-preview-area' ]
				} );
				previewArea.$element.css( 'display', 'none' );
				this.content.$element.append(
					headerMessage.$element,
					dropdown.$element,
					previewArea.$element
				);
				this.$body.append( this.content.$element );

				dropdown.getMenu().on( 'choose', ( menuOption ) => {
					mentorResponse = menuOption.getData();
					api.get( {
						action: 'parse',
						text: mentorResponse,
						disablelimitreport: 1,
						wrapoutputclass: '',
						contentmodel: 'wikitext',
						contentformat: 'text/x-wiki',
						prop: 'text',
						format: 'json'
					} ).then( ( data ) => {
						previewArea.$element.css( 'display', 'block' );
						previewArea.$element.html( data.parse.text[ '*' ] );
						dialogWindowManager.onWindowResize();
					} );
				} );
			};

			CannedResponseDialog.prototype.getActionProcess = function ( action ) {
				if ( !action ) {
					return CannedResponseDialog.super.prototype.getActionProcess.call(
						this,
						action
					);
				}

				return new OO.ui.Process( () => addResponse( sectionNumber ).then( () => {
					this.close( {
						action: action
					} );
				} ) );
			};

			CannedResponseDialog.prototype.getBodyHeight = function () {
				return Math.max( this.content.$element.outerHeight( true ), 400 );
			};

			const dialog = new CannedResponseDialog();
			dialogWindowManager.addWindows( [ dialog ] );
			dialogWindowManager.openWindow( dialog );
		}

		function addResponse( sectionNumberToEdit ) {
			return api.postWithToken( 'csrf', {
				action: 'edit',
				title: mw.config.get( 'wgPageName' ),
				section: sectionNumberToEdit,
				appendtext: `:${ mentorResponse } ~~~~`,
				summary: apiPostSummary,
				tags: 'Adiutor',
				format: 'json'
			} ).then( () => {
				location.reload();
			} );
		}

		function clearURLfromOrigin( sectionPart ) {
			return decodeURIComponent(
				sectionPart.replace(
					'https//:' + mw.config.get( 'wgServerName' ) + '/w/index.php?title=',
					''
				)
			);
		}
	}

	module.exports = {
		callBack: callBack
	};
}() );

/* </nowiki> */
