/* <nowiki> */

/**
 * @file adiutor-del.js
 * @description Deletion module for nominating or directly deleting pages via Adiutor.
 * @license CC BY-SA 4.0
 */

( function () {
	'use strict';

	/**
	 * Open CSD admin dialog for the current page.
	 *
	 * @return {void}
	 */
	function callBack() {
		/** @type {mw.Api} */
		const api = new mw.Api();

		const mwConfig = {
			wgPageName: /** @type {string} */ ( mw.config.get( 'wgPageName' ) ),
			wgWikiID: /** @type {string} */ ( mw.config.get( 'wgWikiID' ) ),
			wgNamespaceNumber: /** @type {number} */ ( mw.config.get( 'wgNamespaceNumber' ) )
		};

		/**
		 * @typedef {Object} CsdConfiguration
		 * @property {Array<{
		 *  name: string,
		 *  namespace: string|number,
		 *  reasons: Array<{
		 *    value: string,
		 *    data: string,
		 *    label: string,
		 *    selected: boolean,
		 *    namespace: string|number,
		 *    help: string
		 *  }>
		 * }>} speedyDeletionReasons
		 * @property {string} talkPagePrefix
		 * @property {string} apiPostSummaryforTalkPage
		 */

		/** @type {CsdConfiguration} */
		const csdConfiguration = require( './adiutor-csd.json' );

		if ( !csdConfiguration ) {
			mw.notify( 'MediaWiki:Gadget-adiutor-csd.json data is empty or undefined.', {
				title: mw.msg( 'operation-failed' ),
				type: 'error'
			} );
			return;
		}

		let namespaceReasons;
		let generalReasons;
		let selectedNamespaceForGeneral;
		let selectedNamespaceForOthers;
		let isCopyVioReasonSelected = false;
		let otherReasonsText = '';
		let copyVioInput = '';
		let csdSummary = '';
		let revDelCount = 0;

		const csdReasons = [];
		const pageTitle = mw.config.get( 'wgPageName' ).replace( /_/g, ' ' );

		api.get( {
			action: 'query',
			format: 'json',
			titles: pageTitle
		} ).then( ( data ) => {
			const pages = data.query.pages;
			const pageId = Object.keys( pages )[ 0 ];
			if ( pageId === '-1' ) {
				return;
			}
			return api.get( {
				action: 'query',
				list: 'logevents',
				leaction: 'delete/delete',
				letprop: 'delete',
				letitle: pageTitle
			} );
		} ).then( ( logData ) => {
			if ( logData && logData.query.logevents ) {
				revDelCount = logData.query.logevents.length;
			}

			const speedyDeletionReasons = csdConfiguration.speedyDeletionReasons;
			const talkPagePrefix = csdConfiguration.talkPagePrefix;
			const apiPostSummaryforTalkPage = csdConfiguration.apiPostSummaryforTalkPage;

			function CsdAdminProcessDialog( config ) {
				CsdAdminProcessDialog.super.call( this, config );
			}

			OO.inheritClass( CsdAdminProcessDialog, OO.ui.ProcessDialog );
			CsdAdminProcessDialog.static.title = pageTitle;
			CsdAdminProcessDialog.static.name = 'CsdAdminProcessDialog';
			CsdAdminProcessDialog.static.actions = [ {
				action: 'continue',
				modes: 'edit',
				label: mw.msg( 'confirm-action' ),
				flags: [ 'primary', 'destructive' ]
			}, {
				action: 'help',
				modes: 'edit',
				label: mw.msg( 'help' )
			}, {
				modes: 'edit',
				label: mw.msg( 'cancel' ),
				flags: 'safe'
			} ];

			CsdAdminProcessDialog.prototype.initialize = function () {
				CsdAdminProcessDialog.super.prototype.initialize.apply( this, arguments );
				const NS_MAIN = 0;
				const NS_USER = 2;
				const NS_USER_TALK = 3;
				const NS_FILE = 6;
				const NS_TEMPLATE = 10;
				const NS_CATEGORY = 14;

				let selectedNamespace = null;
				if ( mw.config.get( 'wgIsRedirect' ) ) {
					selectedNamespace = speedyDeletionReasons.find(
						( reason ) => reason.namespace === 'redirect'
					);
				} else {
					switch ( mwConfig.wgNamespaceNumber ) {
						case NS_MAIN:
						case NS_FILE:
						case NS_CATEGORY:
						case NS_USER:
						case NS_USER_TALK:
						case NS_TEMPLATE:
							if (
								mwConfig.wgNamespaceNumber === NS_USER ||
									mwConfig.wgNamespaceNumber === NS_USER_TALK
							) {
								selectedNamespace = speedyDeletionReasons.find(
									( reason ) => reason.namespace === NS_USER
								);
							} else {
								selectedNamespace = speedyDeletionReasons.find(
									( reason ) => reason.namespace === mwConfig.wgNamespaceNumber
								);
							}
							break;
						default:
							selectedNamespace = null;
					}
				}

				if ( selectedNamespace ) {
					namespaceReasons = new OO.ui.FieldsetLayout( {
						label: selectedNamespace.name
					} );
					selectedNamespace.reasons.forEach( ( reason ) => {
						const checkboxWidget = new OO.ui.CheckboxInputWidget( {
							value: reason.value,
							data: reason.data,
							selected: false
						} );
						const fieldLayout = new OO.ui.FieldLayout( checkboxWidget, {
							label: reason.label,
							align: 'inline',
							help: reason.help
						} );
						namespaceReasons.addItems( [ fieldLayout ] );
						csdReasons.push( {
							input: checkboxWidget,
							reason: reason.data
						} );
					} );
				} else {
					namespaceReasons = new OO.ui.FieldsetLayout( {} );
					namespaceReasons.addItems( [
						new OO.ui.FieldLayout( new OO.ui.MessageWidget( {
							type: 'warning',
							inline: true,
							label: new OO.ui.HtmlSnippet(
								'<strong>' + mw.msg( 'no-namespace-reason-for-csd-title' ) +
										'</strong><br><small>' +
										mw.msg( 'no-namespace-reason-for-csd' ) + '</small>'
							)
						} ) )
					] );
				}

				selectedNamespaceForGeneral = speedyDeletionReasons.find(
					( reason ) => reason.namespace === 'general'
				);
				if ( selectedNamespaceForGeneral ) {
					generalReasons = new OO.ui.FieldsetLayout( {
						label: selectedNamespaceForGeneral.name
					} );
					selectedNamespaceForGeneral.reasons.forEach( ( reason ) => {
						const checkboxWidget = new OO.ui.CheckboxInputWidget( {
							value: reason.value,
							data: reason.data,
							selected: false
						} );
						const fieldLayout = new OO.ui.FieldLayout( checkboxWidget, {
							label: reason.label,
							align: 'inline',
							help: reason.help
						} );
						generalReasons.addItems( [ fieldLayout ] );
						csdReasons.push( {
							input: checkboxWidget,
							reason: reason.data
						} );
					} );
				}

				selectedNamespaceForOthers = speedyDeletionReasons.find(
					( reason ) => reason.namespace === 'others'
				);
				let otherReasonsFieldset;
				if ( selectedNamespaceForOthers ) {
					otherReasonsFieldset = new OO.ui.FieldsetLayout( {
						label: selectedNamespaceForOthers.name
					} );
					selectedNamespaceForOthers.reasons.forEach( ( reason ) => {
						const checkboxWidget = new OO.ui.CheckboxInputWidget( {
							value: reason.value,
							data: reason.data,
							selected: false
						} );
						const fieldLayout = new OO.ui.FieldLayout( checkboxWidget, {
							label: reason.label,
							align: 'inline',
							help: reason.help
						} );
						otherReasonsFieldset.addItems( [ fieldLayout ] );
						csdReasons.push( {
							input: checkboxWidget,
							reason: reason.data
						} );
					} );
				}

				const otherRationaleInput = new OO.ui.TextInputWidget( {
					placeholder: mw.msg( 'other-reason' ),
					value: ''
				} );
				otherRationaleInput.on( 'change', () => {
					otherReasonsText = otherRationaleInput.getValue();
				} );

				const copyvioInputWidget = new OO.ui.TextInputWidget( {
					placeholder: mw.msg( 'copyvio-url' ),
					value: ''
				} );
				copyvioInputWidget.on( 'change', () => {
					copyVioInput = copyvioInputWidget.getValue();
				} );

				const copyvioCheckbox = new OO.ui.CheckboxInputWidget( {
					selected: false
				} );
				copyvioCheckbox.on( 'change', ( isSelected ) => {
					isCopyVioReasonSelected = isSelected;
				} );
				const copyvioField = new OO.ui.FieldLayout( copyvioCheckbox, {
					label: mw.msg( 'mark-as-copyvio' ),
					align: 'inline'
				} );

				this.content = new OO.ui.PanelLayout( {
					padded: true,
					expanded: false
				} );

				this.content.$element.append(
					namespaceReasons.$element,
					generalReasons ? generalReasons.$element : null,
					otherReasonsFieldset ? otherReasonsFieldset.$element : null,
					new OO.ui.FieldLayout( otherRationaleInput, {
						label: mw.msg( 'other-reason' ),
						align: 'top'
					} ).$element,
					copyvioField.$element,
					copyvioInputWidget.$element
				);
				this.$body.append( this.content.$element );
			};

			CsdAdminProcessDialog.prototype.getActionProcess = function ( action ) {
				if ( !action ) {
					return CsdAdminProcessDialog.super.prototype.getActionProcess.call(
						this,
						action
					);
				}

				return new OO.ui.Process( () => {
					const selectedReasons = csdReasons
						.filter( ( reasonObj ) => reasonObj.input.isSelected() )
						.map( ( reasonObj ) => reasonObj.reason );
					csdSummary = selectedReasons.join( ' ' );
					if ( otherReasonsText ) {
						csdSummary += ' ' + otherReasonsText;
					}
					if ( isCopyVioReasonSelected && copyVioInput ) {
						csdSummary += ' ' + copyVioInput;
					}
					if ( revDelCount > 0 ) {
						csdSummary += ' ' + mw.msg( 'csd-revdel-reason' );
					}

					const csdTemplate = mw.config.get( 'wgIsRedirect' ) ? '{{Db-r}}' : '{{delete}}';
					return api.postWithToken( 'csrf', {
						action: 'edit',
						title: pageTitle,
						prependtext: csdTemplate + '\n',
						summary: csdSummary,
						tags: 'Adiutor',
						format: 'json'
					} ).then( () => {
						if (
							mwConfig.wgNamespaceNumber === 3 ||
								mwConfig.wgNamespaceNumber === 2
						) {
							return api.postWithToken( 'csrf', {
								action: 'edit',
								title: talkPagePrefix + pageTitle,
								section: 'new',
								sectiontitle: mw.msg( 'csd-notify-section-title', pageTitle ),
								text: mw.msg( 'csd-notify-template', pageTitle ),
								summary: apiPostSummaryforTalkPage,
								tags: 'Adiutor',
								format: 'json'
							} );
						}
						return undefined;
					} );
				} );
			};

			const windowManager = new OO.ui.WindowManager();
			$( document.body ).append( windowManager.$element );
			const dialog = new CsdAdminProcessDialog();
			windowManager.addWindows( [ dialog ] );
			windowManager.openWindow( dialog );
		} ).catch( () => {
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
