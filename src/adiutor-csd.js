/* <nowiki> */

/**
 * @file adiutor-csd.js
 * @description Speedy deletion module for tagging pages quickly with CSD templates via Adiutor.
 * @license CC BY-SA 4.0
 */

( function () {
	'use strict';

	/**
	 * Open speedy deletion dialog for current page.
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
		const defaultOptions = {
			speedyDeletion: {
				csdSendMessageToCreator: true,
				csdLogNominatedPages: true,
				csdLogPageName: 'CSD log'
			},
			stats: {
				csdRequests: 0
			}
		};
		adiutorUserOptions.speedyDeletion = Object.assign(
			{},
			defaultOptions.speedyDeletion,
			adiutorUserOptions.speedyDeletion
		);
		adiutorUserOptions.stats = Object.assign(
			{},
			defaultOptions.stats,
			adiutorUserOptions.stats
		);

		const mwConfig = {
			wgArticleId: /** @type {number} */ ( mw.config.get( 'wgArticleId' ) ),
			wgPageName: /** @type {string} */ ( mw.config.get( 'wgPageName' ) ),
			wgNamespaceNumber: /** @type {number} */ ( mw.config.get( 'wgNamespaceNumber' ) ),
			wgUserName: /** @type {string|null} */ ( mw.config.get( 'wgUserName' ) )
		};
		const changeTags = mw.config.get( 'wgChangeTags' ) || [];
		const tagParams = Array.isArray( changeTags ) && changeTags.includes( 'Adiutor' ) ?
			{ tags: 'Adiutor' } :
			{};

		/**
		 * @typedef {Object} CsdConfiguration
		 * @property {Array<{
		 *   name: string,
		 *   namespace: string|number,
		 *   reasons: Array<{
		 *     value: string,
		 *     data: string,
		 *     label: string,
		 *     selected: boolean,
		 *     namespace: string|number,
		 *     help: string
		 *   }>
		 * }>} speedyDeletionReasons
		 * @property {string} csdTemplateStartSingleReason
		 * @property {string} csdTemplateStartMultipleReason
		 * @property {string} reasonAndSeparator
		 * @property {string} speedyDeletionPolicyLink
		 * @property {string} speedyDeletionPolicyPageShortcut
		 * @property {string} apiPostSummaryforLog
		 * @property {string} apiPostSummary
		 * @property {string} csdNotificationTemplate
		 * @property {string} userPagePrefix
		 * @property {string} userTalkPagePrefix
		 * @property {string} localLangCode
		 * @property {string} singleReasonSummary
		 * @property {string} multipleReasonSummary
		 * @property {string} copyVioReasonValue
		 * @property {boolean} csdTemplatePostfixReasonData
		 * @property {boolean} csdTemplatePostfixReasonValue
		 * @property {boolean} useVerticalVarForSeparatingMultipleReasons
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

		const pageTitle = mw.config.get( 'wgPageName' ).replace( /_/g, ' ' );
		let revDelCount = 0;

		const csdReasons = [];
		let namespaceReasons;
		let generalReasons;
		let selectedNamespaceForGeneral;
		let selectedNamespaceForOthers;
		let otherReasonsText = '';
		let isCopyVioReasonSelected = false;
		let copyVioInput = '';
		let csdSummary = '';

		api.get( {
			action: 'query',
			list: 'logevents',
			leaction: 'delete/delete',
			letprop: 'delete',
			letitle: pageTitle
		} ).then( ( logData ) => {
			if ( logData.query.logevents ) {
				revDelCount = logData.query.logevents.length;
			}

			const speedyDeletionReasons = csdConfiguration.speedyDeletionReasons;
			const csdTemplateStartSingleReason = csdConfiguration.csdTemplateStartSingleReason;
			const csdTemplateStartMultipleReason = csdConfiguration.csdTemplateStartMultipleReason;
			const apiPostSummaryforLog = csdConfiguration.apiPostSummaryforLog;
			const apiPostSummary = csdConfiguration.apiPostSummary;
			const csdNotificationTemplate = csdConfiguration.csdNotificationTemplate;
			const userTalkPagePrefix = csdConfiguration.userTalkPagePrefix;
			const singleReasonSummary = csdConfiguration.singleReasonSummary;
			const multipleReasonSummary = csdConfiguration.multipleReasonSummary;
			const copyVioReasonValue = csdConfiguration.copyVioReasonValue;
			const csdTemplatePostfixReasonData = csdConfiguration.csdTemplatePostfixReasonData;
			const csdTemplatePostfixReasonValue = csdConfiguration.csdTemplatePostfixReasonValue;
			const useVerticalVarForSeparatingMultipleReasons =
					csdConfiguration.useVerticalVarForSeparatingMultipleReasons;

			function SpeedyDeletionRequestDialog( config ) {
				SpeedyDeletionRequestDialog.super.call( this, config );
			}

			OO.inheritClass( SpeedyDeletionRequestDialog, OO.ui.ProcessDialog );
			SpeedyDeletionRequestDialog.static.name = 'SpeedyDeletionRequestDialog';
			SpeedyDeletionRequestDialog.static.title = OO.ui.deferMsg( 'csd-module-title' );
			SpeedyDeletionRequestDialog.static.actions = [ {
				action: 'continue',
				modes: 'edit',
				label: OO.ui.deferMsg( 'tag-page' ),
				flags: [ 'primary', 'progressive' ]
			}, {
				action: 'policy',
				modes: 'edit',
				label: mw.msg( 'speedy-deletion-policy' ),
				framed: false
			}, {
				modes: 'edit',
				label: OO.ui.deferMsg( 'cancel' ),
				flags: [ 'safe', 'close' ]
			}, {
				action: 'back',
				modes: 'help',
				label: OO.ui.deferMsg( 'back' ),
				flags: [ 'safe', 'back' ]
			} ];

			SpeedyDeletionRequestDialog.prototype.initialize = function () {
				SpeedyDeletionRequestDialog.super.prototype.initialize.apply( this, arguments );
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
							reason: reason.data,
							value: reason.value
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
							reason: reason.data,
							value: reason.value
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
							reason: reason.data,
							value: reason.value
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
				copyvioField.$element.hide();
				copyvioInputWidget.$element.hide();

				const updateCopyvioVisibility = () => {
					const selectedReasonValues = csdReasons
						.filter( ( reasonObj ) => reasonObj.input.isSelected() )
						.map( ( reasonObj ) => reasonObj.value );
					const isCopyvioSelected = selectedReasonValues.includes(
						copyVioReasonValue
					);
					copyvioField.$element.toggle( isCopyvioSelected );
					copyvioInputWidget.$element.toggle( isCopyvioSelected );
					if ( !isCopyvioSelected ) {
						copyvioCheckbox.setSelected( false );
						isCopyVioReasonSelected = false;
						copyVioInput = '';
						copyvioInputWidget.setValue( '' );
					}
				};
				csdReasons.forEach( ( reasonObj ) => {
					reasonObj.input.on( 'change', updateCopyvioVisibility );
				} );
				updateCopyvioVisibility();

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

			SpeedyDeletionRequestDialog.prototype.getActionProcess = function ( action ) {
				if ( !action ) {
					return SpeedyDeletionRequestDialog.super.prototype.getActionProcess.call(
						this,
						action
					);
				}

				return new OO.ui.Process( () => {
					const selectedReasonValues = csdReasons
						.filter( ( reasonObj ) => reasonObj.input.isSelected() )
						.map( ( reasonObj ) => reasonObj.value );
					const selectedReasonLabels = csdReasons
						.filter( ( reasonObj ) => reasonObj.input.isSelected() )
						.map( ( reasonObj ) => reasonObj.reason );
					const separator = useVerticalVarForSeparatingMultipleReasons ? '\n' : ' ';

					if ( selectedReasonValues.length === 1 ) {
						csdSummary = singleReasonSummary.replace( '$2', selectedReasonValues[ 0 ] );
					} else {
						csdSummary = multipleReasonSummary.replace(
							'$2',
							selectedReasonValues.join( separator )
						);
					}

					if ( otherReasonsText ) {
						csdSummary += separator + otherReasonsText;
					}
					if ( isCopyVioReasonSelected && copyVioInput ) {
						csdSummary += separator + copyVioReasonValue + ' ' + copyVioInput;
					}
					if ( revDelCount > 0 ) {
						csdSummary += separator + mw.msg( 'csd-revdel-reason' );
					}

					const normalizedSingleStart = csdTemplateStartSingleReason.replace(
						'$3',
						''
					);
					const normalizedMultipleStart = csdTemplateStartMultipleReason;
					let csdTemplate = '';
					if ( selectedReasonValues.length > 1 ) {
						csdTemplate = normalizedMultipleStart +
							selectedReasonValues.join( '|' );
					} else {
						csdTemplate = normalizedSingleStart +
							selectedReasonValues[ 0 ];
					}

					if ( csdTemplatePostfixReasonData ) {
						csdTemplate += '|' + selectedReasonLabels.join( '|' );
					}

					if ( csdTemplatePostfixReasonValue && selectedReasonValues.length > 1 ) {
						csdTemplate += '|' +
								selectedReasonValues.map( ( reason ) => ':' + reason ).join( '|' );
					}

					csdTemplate += '}}';

					const notifyCreator = adiutorUserOptions.speedyDeletion.csdSendMessageToCreator;
					const logCsd = adiutorUserOptions.speedyDeletion.csdLogNominatedPages;
					const csdLogPageName = adiutorUserOptions.speedyDeletion.csdLogPageName;

					const pageEdit = api.postWithToken( 'csrf', Object.assign( {
						action: 'edit',
						title: pageTitle,
						prependtext: csdTemplate + '\n',
						summary: csdSummary,
						format: 'json'
					}, tagParams ) );

					const notifyCreatorPromise = notifyCreator ? api.postWithToken(
						'csrf',
						Object.assign( {
							action: 'edit',
							title: userTalkPagePrefix + mwConfig.wgUserName,
							section: 'new',
							sectiontitle: mw.msg( 'csd-notify-section-title', pageTitle ),
							text: csdNotificationTemplate.replace( '$1', pageTitle )
								.replace( '$2', csdSummary ),
							summary: apiPostSummaryforLog,
							format: 'json'
						}, tagParams )
					) : Promise.resolve();

					const logPromise = logCsd ? api.postWithToken( 'csrf', Object.assign( {
						action: 'edit',
						title: csdLogPageName,
						section: 'new',
						sectiontitle: pageTitle,
						text: '* ' + pageTitle + ' – ' + csdSummary,
						summary: apiPostSummary,
						format: 'json'
					}, tagParams ) ) : Promise.resolve();

					return Promise.all( [ pageEdit, notifyCreatorPromise, logPromise ] )
						.then( () => {
							window.location.reload();
						} )
						.catch( ( error ) => {
							let errorText = mw.msg( 'operation-failed' );
							if ( Array.isArray( error ) && error[ 0 ] && error[ 0 ].text ) {
								errorText = error[ 0 ].text;
							} else if ( error && error.message ) {
								errorText = error.message;
							}
							throw new OO.ui.Error( errorText, { recoverable: false } );
						} );
				} );
			};

			SpeedyDeletionRequestDialog.prototype.getSetupProcess = function ( dialogData ) {
				return SpeedyDeletionRequestDialog.super.prototype.getSetupProcess
					.call( this, dialogData )
					.next( function () {
						this.actions.setMode( 'edit' );
					}, this );
			};

			const windowManager = new OO.ui.WindowManager();
			$( document.body ).append( windowManager.$element );
			const dialog = new SpeedyDeletionRequestDialog();
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
