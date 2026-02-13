/* <nowiki> */

/**
 * @file adiutor-aiv.js
 * @description Administrator intervention module for handling vandalism reports via Adiutor.
 * @license CC BY-SA 4.0
 * @see https://meta.wikimedia.org/wiki/Adiutor
 * @author Doğu Abaris <abaris@null.net>
 */

( function () {
	'use strict';

	/**
	 * Launch the AIV flow (dialog + submission handlers).
	 */
	function callBack() {
		/**
		 * A reference to MediaWiki’s core API.
		 *
		 * @type {mw.Api}
		 */
		const api = new mw.Api();

		/**
		 * MediaWiki config variables.
		 *
		 * @typedef {Object} MwConfig
		 * @property {string} wgPageName
		 *
		 * @type {MwConfig}
		 */
		const mwConfig = {
			wgPageName: /** @type {string} */ ( mw.config.get( 'wgPageName' ) )
		};

		/**
		 * @typedef {Object} AivConfiguration
		 * @property {Array<{ label: string, data: string, related: string }>} reportRationales
		 * @property {string} noticeBoardTitle
		 * @property {boolean} addNewSection
		 * @property {string} sectionTitle
		 * @property {string} apiPostSummary
		 * @property {string|undefined} sectionId
		 * @property {boolean} appendText
		 * @property {boolean} prependText
		 * @property {string} spiNoticeBoard
		 * @property {string} spiNoticeBoardCase
		 * @property {string} spiApiPostSummary
		 * @property {string} spiApiPostCaseSummary
		 * @property {string} contentPattern
		 * @property {string} userPagePrefix
		 * @property {string} userTalkPagePrefix
		 * @property {string} specialContributions
		 * @property {string} rationaleText
		 * @property {string} sockpuppetTemplate
		 * @property {string} sockpuppeteerContentPattern
		 * @property {string} sockpuppetContentPattern
		 */

		/** @type {AivConfiguration} */
		const aivConfiguration = require( './adiutor-aiv.json' );

		if ( !aivConfiguration ) {
			mw.notify( 'MediaWiki:Gadget-adiutor-aiv.json data is empty or undefined.', {
				title: mw.msg( 'operation-failed' ),
				type: 'error'
			} );
			return;
		}

		let rationaleInput;
		let reportType;
		let sockPuppetsList;
		let sockpuppetryType;
		let preparedContent = '';
		let evidenceTextInput;
		let sockpuppeteerInput;
		let requestRationale;
		let placeholders = {};
		const vandalizedPage = new OO.ui.TextInputWidget( { value: '' } );
		const revisionIdInput = new OO.ui.TextInputWidget( { value: '' } );

		const reportRationales = aivConfiguration.reportRationales;
		const noticeBoardTitle = aivConfiguration.noticeBoardTitle;
		const noticeBoardLink = noticeBoardTitle.replace( / /g, '_' );
		const addNewSection = aivConfiguration.addNewSection;
		const sectionTitle = aivConfiguration.sectionTitle;
		const apiPostSummary = aivConfiguration.apiPostSummary;
		const sectionId = aivConfiguration.sectionId;
		const appendText = aivConfiguration.appendText;
		const prependText = aivConfiguration.prependText;
		const spiNoticeBoard = aivConfiguration.spiNoticeBoard;
		const spiNoticeBoardCase = aivConfiguration.spiNoticeBoardCase;
		const spiApiPostSummary = aivConfiguration.spiApiPostSummary;
		const spiApiPostCaseSummary = aivConfiguration.spiApiPostCaseSummary;
		const contentPattern = aivConfiguration.contentPattern;
		const userPagePrefix = aivConfiguration.userPagePrefix;
		const userTalkPagePrefix = aivConfiguration.userTalkPagePrefix;
		const specialContributions = aivConfiguration.specialContributions;
		const rationaleText = aivConfiguration.rationaleText;
		const sockpuppetTemplate = aivConfiguration.sockpuppetTemplate;
		const sockpuppeteerContentPattern = aivConfiguration.sockpuppeteerContentPattern;
		const sockpuppetContentPattern = aivConfiguration.sockpuppetContentPattern;
		const userReported = getFormattedPageName( mwConfig, {
			userPagePrefix,
			userTalkPagePrefix,
			specialContributions
		} );

		/**
		 * The main OOUI dialog for the AIV process.
		 * Inherits from `OO.ui.ProcessDialog`.
		 *
		 * @constructor
		 * @extends OO.ui.ProcessDialog
		 * @param {Object} config - The configuration object for the dialog.
		 * @param {string} config.size - The dialog size (e.g., “large”).
		 * @param {string[]} config.classes - Additional CSS classes for the dialog.
		 * @param {boolean} config.isDraggable - Whether the dialog is draggable.
		 * @return {void}
		 */
		function AivDialog( config ) {
			AivDialog.super.call( this, config );
		}

		OO.inheritClass( AivDialog, OO.ui.ProcessDialog );
		AivDialog.static.name = 'AivDialog';
		AivDialog.static.title = OO.ui.deferMsg( 'aiv-module-title' );
		AivDialog.static.actions = [ {
			action: 'save',
			label: OO.ui.deferMsg( 'report' ),
			flags: [ 'primary', 'progressive' ]
		}, {
			label: OO.ui.deferMsg( 'cancel' ),
			flags: 'safe'
		} ];
		AivDialog.prototype.initialize = function () {
			AivDialog.super.prototype.initialize.apply( this, arguments );
			const headerTitle = new OO.ui.MessageWidget( {
				type: 'notice',
				inline: true,
				label: OO.ui.deferMsg( 'aiv-header-title' )
			} );
			const headerTitleDescription = new OO.ui.LabelWidget( {
				label: OO.ui.deferMsg( 'aiv-header-description' )
			} );
			headerTitleDescription.$element.css( {
				'margin-top': '20px',
				'font-weight': '300'
			} );
			const dialogWindowManager = new OO.ui.WindowManager();
			$( document.body ).append( dialogWindowManager.$element );

			const rationaleSelector = new OO.ui.DropdownWidget( {
				menu: {
					items: [
						new OO.ui.MenuOptionWidget( {
							data: 1,
							label: OO.ui.deferMsg( 'vandalism' )
						} ),
						new OO.ui.MenuOptionWidget( {
							data: 2,
							label: OO.ui.deferMsg( 'username-violation' )
						} ),
						new OO.ui.MenuOptionWidget( {
							data: 3,
							label: OO.ui.deferMsg( 'sockpuppeteer' )
						} ),
						new OO.ui.MenuOptionWidget( {
							data: 4,
							label: OO.ui.deferMsg( 'sockpuppet' )
						} )
					]
				},
				label: OO.ui.deferMsg( 'report-type' )
			} );
			rationaleSelector.$element.css( 'margin-top', '20px' );
			this.content = new OO.ui.PanelLayout( {
				padded: true,
				expanded: false
			} );
			const requestRationaleContainer = new OO.ui.FieldsetLayout( {
				classes: [ 'adiutor-report-window-rationale-window' ]
			} );
			requestRationaleContainer.$element.css( 'margin-top', '20px' );
			rationaleSelector.getMenu().on( 'choose', ( menuOption ) => {
				switch ( menuOption.getData() ) {
					case 1: {
						requestRationale = new OO.ui.FieldsetLayout( {
							label: mw.msg( 'rationale' )
						} );
						const generalRationales = reportRationales.filter( ( item ) => item.related === 'general' );
						requestRationale.addItems( [
							new OO.ui.FieldLayout( vandalizedPage, {
								label: OO.ui.deferMsg( 'related-page' ),
								help: OO.ui.deferMsg( 'related-page-description' )
							} ),
							new OO.ui.FieldLayout( revisionIdInput, {
								label: OO.ui.deferMsg( 'revision-id' ),
								help: OO.ui.deferMsg( 'revision-id-description' )
							} )
						] );
						generalRationales.forEach( ( rationaleItem ) => {
							requestRationale.addItems( [
								new OO.ui.FieldLayout( new OO.ui.CheckboxInputWidget( {
									selected: false,
									data: rationaleItem.data
								} ), {
									label: rationaleItem.label,
									align: 'inline'
								} )
							] );
						} );
						reportType = 'regularReport';
						break;
					}
					case 2: {
						requestRationale = new OO.ui.FieldsetLayout( {
							label: mw.msg( 'rationale' )
						} );
						const usernameRationales = reportRationales.filter( ( item ) => item.related === 'username' );
						usernameRationales.forEach( ( rationaleItem ) => {
							requestRationale.addItems( [
								new OO.ui.FieldLayout( new OO.ui.CheckboxInputWidget( {
									selected: false,
									data: rationaleItem.data
								} ), {
									label: rationaleItem.label,
									align: 'inline'
								} )
							] );
						} );
						reportType = 'regularReport';
						break;
					}
					case 3: {
						requestRationale = new OO.ui.FieldsetLayout( {
							label: mw.msg( 'report-suspected-sockpuppeteer' )
						} );
						requestRationale.addItems( [
							new OO.ui.MessageWidget( {
								type: 'warning',
								inline: true,
								label: mw.msg( 'sockpuppetry-warning-text' )
							} ),
							new OO.ui.FieldLayout(
								sockPuppetsList = new OO.ui.TagMultiselectWidget( {
									placeholder: mw.msg( 'sockpuppets-input-placeholder' ),
									allowArbitrary: true
								} )
							),
							new OO.ui.FieldLayout(
								evidenceTextInput = new OO.ui.MultilineTextInputWidget( {
									placeholder: mw.msg( 'evidence-input-placeholder' ),
									value: '',
									indicator: 'required'
								} ),
								{
									label: mw.msg( 'evidence' ),
									align: 'inline'
								}
							)
						] );
						reportType = 'sockpuppetry';
						sockpuppetryType = 'sockpuppeteer';
						break;
					}
					case 4: {
						requestRationale = new OO.ui.FieldsetLayout( {
							label: mw.msg( 'report-suspected-sockpuppet' )
						} );
						requestRationale.addItems( [
							new OO.ui.MessageWidget( {
								type: 'warning',
								inline: true,
								label: mw.msg( 'sockpuppetry-warning-text' )
							} ),
							new OO.ui.FieldLayout(
								sockpuppeteerInput = new OO.ui.TextInputWidget( {
									value: '',
									indicator: 'required'
								} ),
								{
									label: mw.msg( 'sockpuppeteer' ),
									help: mw.msg( 'sockpuppeteer-help-text' )
								}
							),
							new OO.ui.FieldLayout(
								evidenceTextInput = new OO.ui.MultilineTextInputWidget( {
									placeholder: mw.msg( 'evidence-input-placeholder' ),
									value: '',
									indicator: 'required'
								} ),
								{
									label: mw.msg( 'evidence' ),
									align: 'inline'
								}
							)
						] );
						reportType = 'sockpuppetry';
						sockpuppetryType = 'sockpuppet';
						break;
					}
				}
				requestRationaleContainer.$element.html( requestRationale.$element );
				dialogWindowManager.onWindowResize();
			} );
			this.content.$element.append(
				headerTitle.$element,
				headerTitleDescription.$element,
				rationaleSelector.$element,
				requestRationaleContainer.$element
			);
			this.$body.append( this.content.$element );
		};
		AivDialog.prototype.getActionProcess = function ( action ) {
			if ( action ) {
				switch ( reportType ) {
					case 'sockpuppetry':
						switch ( sockpuppetryType ) {
							case 'sockpuppeteer': {
								const selectedValues = sockPuppetsList.getValue();
								const sockpuppets = selectedValues.map(
									( value ) => '\n* {{' + sockpuppetTemplate + '|' + value + '}}'
								);
								const formattedSockpuppets = sockpuppets.join( '' );
								placeholders = {
									$1: userReported,
									$3: formattedSockpuppets,
									$5: evidenceTextInput.getValue()
								};
								preparedContent = replacePlaceholders(
									sockpuppeteerContentPattern,
									placeholders
								);
								postSockpuppetRequest( userReported );
								break;
							}
							case 'sockpuppet': {
								placeholders = {
									$1: sockpuppeteerInput.value,
									$3: userReported,
									$5: evidenceTextInput.getValue()
								};
								preparedContent = replacePlaceholders(
									sockpuppetContentPattern,
									placeholders
								);
								postSockpuppetRequest( sockpuppeteerInput.value );
								break;
							}
						}
						break;
					case 'regularReport':
						if ( requestRationale ) {
							rationaleInput = findSelectedRationale();
							if ( rationaleInput ) {
								const revisionLink = revisionIdInput.getValue() ?
									'([[Special:Diff|' + revisionIdInput.getValue() + ']])' : '';
								placeholders = {
									$1: userReported,
									$2: rationaleText
										.replace( /\$1/g, vandalizedPage.getValue() )
										.replace( /\$2/g, revisionLink )
										.replace( /\$3/g, rationaleInput )
								};
								preparedContent = replacePlaceholders(
									contentPattern,
									placeholders
								);
								postRegularReport();
							} else {
								mw.notify( mw.msg( 'select-rationale' ), {
									title: mw.msg( 'operation-failed' ),
									type: 'warning'
								} );
							}
						}
						break;
				}
			}
			return AivDialog.super.prototype.getActionProcess.call( this, action );
		};

		/**
		 * Replace positional placeholders ($1, $2, …) in a template string.
		 *
		 * @param {string} input - Text containing placeholders.
		 * @param {Object.<string, string>} replacements - Mapping of placeholders.
		 * @return {string} Updated text.
		 */
		function replacePlaceholders( input, replacements ) {
			return input.replace( /\$(\d+)/g, ( match, group ) => {
				const replacement = replacements[ '$' + group ];
				return replacement !== undefined ? replacement : match;
			} );
		}

		/**
		 * Replace a single placeholder in the given string.
		 *
		 * @param {string} input - Template text.
		 * @param {string} parameterName - Placeholder name without dollar sign.
		 * @param {string|number} newValue - Replacement value.
		 * @return {string} Updated string.
		 */
		function replaceParameter( input, parameterName, newValue ) {
			const regex = new RegExp( '\\$' + parameterName, 'g' );
			if ( input.includes( '$' + parameterName ) ) {
				return input.replace( regex, newValue );
			} else {
				return input;
			}
		}

		/**
		 * Get a display-friendly username/page title.
		 *
		 * @param {MwConfig} config - MediaWiki config subset.
		 * @param {Object} prefixes - Prefix strings to strip.
		 * @return {string} Formatted page name.
		 */
		function getFormattedPageName( config, prefixes ) {
			return config.wgPageName
				.replace( /_/g, ' ' )
				.replace( prefixes.userPagePrefix, '' )
				.replace( prefixes.specialContributions, '' )
				.replace( prefixes.userTalkPagePrefix, '' );
		}

		function postSockpuppetRequest( sockpuppeteer ) {
			const noticeBoardCaseTitle = spiNoticeBoardCase + '/' + sockpuppeteer;
			api.postWithToken( 'csrf', {
				action: 'edit',
				title: noticeBoardCaseTitle,
				appendtext: preparedContent,
				summary: replaceParameter( spiApiPostSummary, '1', sockpuppeteer ),
				tags: 'Adiutor',
				format: 'json'
			} ).then( () => api.postWithToken( 'csrf', {
				action: 'edit',
				title: spiNoticeBoard,
				appendtext: '\n{{' + noticeBoardCaseTitle + '}}',
				summary: replaceParameter( spiApiPostCaseSummary, '1', noticeBoardCaseTitle ),
				tags: 'Adiutor',
				format: 'json'
			} ) ).then( () => {
				window.location = '/wiki/' + noticeBoardCaseTitle;
			} );
		}

		function findSelectedRationale() {
			let selected = null;
			if ( requestRationale ) {
				requestRationale.items.forEach( ( rationaleField ) => {
					if ( rationaleField.fieldWidget.selected ) {
						selected = rationaleField.fieldWidget.data;
					}
				} );
			}
			return selected;
		}

		function postRegularReport() {
			const apiParams = {
				action: 'edit',
				title: noticeBoardTitle,
				summary: replaceParameter( apiPostSummary, '1', userReported ),
				tags: 'Adiutor',
				format: 'json'
			};
			if ( addNewSection ) {
				apiParams.section = 'new';
				apiParams.sectiontitle = replaceParameter( sectionTitle, '1', userReported );
				apiParams.text = preparedContent;
			} else {
				if ( sectionId ) {
					apiParams.section = sectionId;
				}
				if ( appendText ) {
					apiParams.appendtext = preparedContent + '\n';
				} else if ( prependText ) {
					apiParams.prependtext = preparedContent + '\n';
				} else {
					apiParams.text = preparedContent + '\n';
				}
			}
			api.postWithToken( 'csrf', apiParams ).then( () => {
				window.location = '/wiki/' + noticeBoardLink;
			} );
		}

		const aivWindowManager = new OO.ui.WindowManager();
		$( document.body ).append( aivWindowManager.$element );
		const aivDialog = new AivDialog();
		aivWindowManager.addWindows( [ aivDialog ] );
		aivWindowManager.openWindow( aivDialog );
	}

	module.exports = {
		callBack: callBack
	};

}() );
/* </nowiki> */
