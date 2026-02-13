/* <nowiki> */

/**
 * @file adiutor-afd.js
 * @description Article for Deletion (AFD) module for the Adiutor gadget. It provides an
 * OOUI-based workflow for nominating pages for deletion, informing creators, logging
 * nominations, etc.
 * @license CC BY-SA 4.0
 * @see https://meta.wikimedia.org/wiki/Adiutor
 * @author Doğu Abaris <abaris@null.net>
 */

( function () {
	'use strict';

	function callBack() {

		/**
		 * A reference to MediaWiki’s core API.
		 *
		 * @type {mw.Api}
		 */
		const api = new mw.Api();

		/**
		 * The wiki ID (e.g., "enwiki") as used for user preferences.
		 *
		 * @type {string}
		 */
		const wikiId = /** @type {string} */ ( mw.config.get( 'wgWikiID' ) );

		/**
		 * Adiutor user options. These are read from the user’s preferences (global or local).
		 *
		 * @type {Object}
		 */
		const adiutorUserOptions = JSON.parse(
			mw.user.options.get( 'userjs-adiutor-' + wikiId ) || '{}'
		);
		const defaultOptions = {
			articlesForDeletion: {
				afdSendMessageToCreator: true,
				afdLogNominatedPages: true,
				afdLogPageName: 'AFD log',
				afdNominateOpinionsLog: true,
				afdOpinionLogPageName: 'AFD opinion log'
			},
			speedyDeletion: {
				afdLogNominatedPages: false,
				afdLogPageName: 'AFD log',
				csdLogPageName: 'CSD log'
			},
			stats: {
				afdRequests: 0
			}
		};
		adiutorUserOptions.articlesForDeletion = Object.assign(
			{},
			defaultOptions.articlesForDeletion,
			adiutorUserOptions.articlesForDeletion
		);
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

		/**
		 * MediaWiki config variables.
		 *
		 * @typedef {Object} MwConfig
		 * @property {number} wgArticleId
		 * @property {string} wgPageName
		 * @property {string|null} wgUserName
		 *
		 * @type {MwConfig}
		 */
		const mwConfig = {
			wgArticleId: /** @type {number} */ ( mw.config.get( 'wgArticleId' ) ),
			wgPageName: /** @type {string} */ ( mw.config.get( 'wgPageName' ) ),
			wgUserName: /** @type {string|null} */ ( mw.config.get( 'wgUserName' ) )
		};

		/**
		 * @typedef {Object} AfdConfiguration
		 * @property {string} afdTemplate
		 * @property {string} afdPageTitleForMultipleNomination
		 * @property {string} apiPostSummary
		 * @property {string} apiPostSummaryforCreator
		 * @property {string} apiPostSummaryforUserLog
		 * @property {string} apiPostSummaryforAfdPage
		 * @property {string} apiPostSummaryforAfdLog
		 * @property {boolean} addNominationToNoticeboard
		 * @property {string} contentPattern
		 * @property {string} noticeBoardTitle
		 * @property {boolean} logNominations
		 * @property {string} afdLogPage
		 * @property {string} afdNotificationTemplate
		 * @property {string} userLogText
		 * @property {string} userPagePrefix
		 * @property {string} userTalkPagePrefix
		 * @property {string[]} localMonthsNames
		 * @property {boolean} addNominationToNoticeboardByFindLast
		 * @property {boolean} addNewSection
		 * @property {string} sectionTitle
		 * @property {boolean} appendText
		 * @property {boolean} prependText
		 * @property {string|undefined} sectionId
		 */

		/** @type {AfdConfiguration} */
		const afdConfiguration = require( './adiutor-afd.json' );

		if ( !afdConfiguration ) {
			mw.notify( 'MediaWiki:Gadget-adiutor-afd.json data is empty or undefined.', {
				title: mw.msg( 'operation-failed' ),
				type: 'error'
			} );
			return;
		}

		let afdOptions;
		let rationaleField;
		let rationaleInput;
		let nextNominationNumber = 0;
		const afdTemplate = afdConfiguration.afdTemplate;
		const afdPageTitleForMultipleNomination =
			afdConfiguration.afdPageTitleForMultipleNomination;
		const apiPostSummary = afdConfiguration.apiPostSummary;
		const apiPostSummaryforCreator = afdConfiguration.apiPostSummaryforCreator;
		const apiPostSummaryforUserLog = afdConfiguration.apiPostSummaryforUserLog;
		const apiPostSummaryforAfdPage = afdConfiguration.apiPostSummaryforAfdPage;
		const apiPostSummaryforAfdLog = afdConfiguration.apiPostSummaryforAfdLog;
		const addNominationToNoticeboard = afdConfiguration.addNominationToNoticeboard;
		const contentPattern = afdConfiguration.contentPattern;
		const noticeBoardTitle = afdConfiguration.noticeBoardTitle;
		const noticeBoardLink = noticeBoardTitle.replace( / /g, '_' );
		const logNominations = afdConfiguration.logNominations;
		const afdLogPage = afdConfiguration.afdLogPage;
		const afdNotificationTemplate = afdConfiguration.afdNotificationTemplate;
		const userLogText = afdConfiguration.userLogText;
		const userPagePrefix = afdConfiguration.userPagePrefix;
		const userTalkPagePrefix = afdConfiguration.userTalkPagePrefix;
		const localMonthsNames = afdConfiguration.localMonthsNames;
		const addNominationToNoticeboardByFindLast =
			afdConfiguration.addNominationToNoticeboardByFindLast;
		const addNewSection = afdConfiguration.addNewSection;
		const sectionTitle = afdConfiguration.sectionTitle;
		const appendText = afdConfiguration.appendText;
		const prependText = afdConfiguration.prependText;
		const sectionId = afdConfiguration.sectionId;
		const localLangCode = /** @type {string} */ ( mw.config.get( 'wgUserLanguage' ) );
		let pageTitle = mw.config.get( 'wgPageName' ).replace( /_/g, ' ' );

		/**
		 * The main OOUI dialog for the AFD process.
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
		function ArticleForDeletionDialog( config ) {
			ArticleForDeletionDialog.super.call( this, config );
		}

		OO.inheritClass( ArticleForDeletionDialog, OO.ui.ProcessDialog );
		ArticleForDeletionDialog.static.name = 'ArticleForDeletionDialog';
		ArticleForDeletionDialog.static.title = OO.ui.deferMsg( 'afd-module-title' );
		ArticleForDeletionDialog.static.actions = [ {
			action: 'save',
			label: OO.ui.deferMsg( 'continue' ),
			flags: [ 'primary', 'progressive' ]
		}, {
			label: OO.ui.deferMsg( 'cancel' ),
			flags: 'safe'
		} ];
		ArticleForDeletionDialog.prototype.initialize = function () {
			ArticleForDeletionDialog.super.prototype.initialize.apply( this, arguments );
			const headerTitle = new OO.ui.MessageWidget( {
				type: 'notice',
				inline: true,
				label: OO.ui.deferMsg( 'afd-header-title' )
			} );
			const headerTitleDescription = new OO.ui.LabelWidget( {
				label: OO.ui.deferMsg( 'afd-header-description' )
			} );
			headerTitleDescription.$element.css( {
				'margin-top': '20px',
				'margin-bottom': '20px'
			} );
			afdOptions = new OO.ui.FieldsetLayout( {} );
			afdOptions.addItems( [
				rationaleField = new OO.ui.FieldLayout(
					rationaleInput = new OO.ui.MultilineTextInputWidget( {
						placeholder: OO.ui.deferMsg( 'afd-rationale-placeholder' ),
						indicator: 'required',
						value: ''
					} ),
					{
						label: OO.ui.deferMsg( 'rationale' ),
						align: 'inline'
					}
				),
				new OO.ui.FieldLayout( new OO.ui.ToggleSwitchWidget( {
					value: adiutorUserOptions.articlesForDeletion.afdSendMessageToCreator,
					data: 'informCreator'
				} ), {
					label: OO.ui.deferMsg( 'afd-inform-creator' ),
					align: 'top',
					help: OO.ui.deferMsg( 'afd-inform-creator-help' )
				} )
			] );
			rationaleField.$element.css( 'font-weight', '900' );
			this.content = new OO.ui.PanelLayout( {
				padded: true,
				expanded: false,
				isDraggable: true
			} );
			this.content.$element.append(
				headerTitle.$element,
				headerTitleDescription.$element,
				afdOptions.$element
			);
			this.$body.append( this.content.$element );
		};
		ArticleForDeletionDialog.prototype.getActionProcess = function ( action ) {
			const processDialog = this;
			if ( action ) {
				return new OO.ui.Process( () => {
					const actionOptions = [];
					afdOptions.items.forEach( ( option ) => {
						if ( option.fieldWidget.selected ) {
							actionOptions.push( {
								value: option.fieldWidget.value,
								selected: option.fieldWidget.selected
							} );
						}
						if ( option.fieldWidget.value === true ) {
							actionOptions.push( {
								value: option.fieldWidget.value,
								data: option.fieldWidget.data
							} );
						}
					} );
					actionOptions.forEach( ( option ) => {
						if ( option.data === 'informCreator' ) {
							getCreator().then( ( data ) => {
								const author = data.query.pages[ mw.config.get( 'wgArticleId' ) ].revisions[ 0 ].user;
								if ( !mw.util.isIPAddress( author ) ) {
									const message = replaceParameter( afdNotificationTemplate, '1', pageTitle );
									sendMessageToAuthor( author, message );
								}
							} );
						}
					} );
					checkPreviousNominations( noticeBoardTitle + '/' + mwConfig.wgPageName ).then( ( data ) => {
						if ( data.query.pages[ '-1' ] ) {
							const nomCount = 0;
							nextNominationNumber = nomCount;
							putAfDTemplate( afdTemplate, nextNominationNumber );
						} else {
							findNextNominationNumber( 2 );
						}
					} );

					function findNextNominationNumber( nomCount ) {
						const placeholders = {
							$1: pageTitle,
							$2: nomCount
						};
						const newNominationTitle = replacePlaceholders(
							afdPageTitleForMultipleNomination,
							placeholders
						);
						checkPreviousNominations( noticeBoardTitle + '/' + newNominationTitle ).then( ( data ) => {
							if ( !data.query.pages[ '-1' ] ) {
								findNextNominationNumber( nomCount + 1 );
							} else {
								nextNominationNumber = nomCount;
								putAfDTemplate( afdTemplate, nextNominationNumber );
							}
						} );
					}

					processDialog.close( {
						action: action
					} );
					showProgress();
				} );
			}
			return ArticleForDeletionDialog.super.prototype.getActionProcess.call( this, action );
		};
		const afdWindowManager = new OO.ui.WindowManager();
		$( document.body ).append( afdWindowManager.$element );
		const afdDialog = new ArticleForDeletionDialog( {
			size: 'large',
			classes: [ 'afd-helper-window' ],
			isDraggable: true
		} );
		afdWindowManager.addWindows( [ afdDialog ] );
		afdWindowManager.openWindow( afdDialog );

		/**
		 * Replace positional placeholders ($1, $2, …) in the given string.
		 *
		 * @param {string} input - Text with numbered placeholders.
		 * @param {Object.<string, string|number>} replacements - Mapping of placeholders.
		 * @return {string} Text with placeholders replaced.
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
		 * Prepend the AfD template to the current page.
		 *
		 * @param {string} afdTemplateText - Template wikitext.
		 * @param {number} nominationNumber - Sequence number for multiple nominations.
		 * @return {void}
		 */
		function putAfDTemplate( afdTemplateText, nominationNumber ) {
			if ( nominationNumber > 1 ) {
				const placeholders = {
					$1: pageTitle,
					$2: nominationNumber
				};
				pageTitle = replacePlaceholders( afdPageTitleForMultipleNomination, placeholders );
			} else {
				pageTitle = mwConfig.wgPageName;
			}
			api.postWithToken( 'csrf', {
				action: 'edit',
				title: mwConfig.wgPageName,
				prependtext: afdTemplateText + '\n',
				summary: apiPostSummary,
				tags: 'Adiutor',
				format: 'json'
			} ).then( () => {
				createNominationPage( pageTitle );
				logNomination( pageTitle, adiutorUserOptions );
			} );
		}

		/**
		 * Check if a page already exists (used to detect previous nominations).
		 *
		 * @param {string} title - Full page title to check.
		 * @return {Promise} API response promise.
		 */
		function checkPreviousNominations( title ) {
			return api.get( {
				action: 'query',
				prop: 'revisions',
				rvlimit: 1,
				rvprop: [ 'user' ],
				rvdir: 'newer',
				titles: title
			} );
		}

		/**
		 * Create the nomination subpage with the provided content.
		 *
		 * @param {string} targetPageTitle - Target page title.
		 */
		function createNominationPage( targetPageTitle ) {
			const placeholders = {
				$1: targetPageTitle,
				$2: nextNominationNumber,
				$3: rationaleInput.value
			};
			const preparedContent = replacePlaceholders( contentPattern, placeholders );
			api.postWithToken( 'csrf', {
				action: 'edit',
				title: noticeBoardTitle + targetPageTitle,
				appendtext: preparedContent,
				summary: apiPostSummary,
				tags: 'Adiutor',
				format: 'json'
			} );
		}

		if ( addNominationToNoticeboard ) {
			const placeholders = {
				$1: pageTitle,
				$2: pageTitle,
				$3: rationaleInput.value
			};
			const preparedContent = replacePlaceholders( contentPattern, placeholders );
			const apiParams = {
				action: 'edit',
				title: noticeBoardTitle,
				summary: replaceParameter( apiPostSummary, '1', pageTitle ),
				tags: 'Adiutor',
				format: 'json'
			};
			if ( addNewSection ) {
				apiParams.section = 'new';
				apiParams.sectiontitle = replaceParameter( sectionTitle, '1', pageTitle );
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
		if ( addNominationToNoticeboardByFindLast ) {
			let pageContent;
			api.get( {
				action: 'parse',
				page: noticeBoardTitle,
				prop: 'wikitext',
				format: 'json'
			} ).then( ( data ) => {
				pageContent = data.parse.wikitext[ '*' ];
				const normalizedPageTitle = pageTitle.replace( /_/g, ' ' );
				const nominationTemplate = '{{' + noticeBoardTitle + '/' +
						normalizedPageTitle + '}}';
				const nominatedBefore = pageContent.includes( nominationTemplate );
				if ( !nominatedBefore ) {
					api.postWithToken( 'csrf', {
						action: 'edit',
						title: noticeBoardTitle,
						appendtext: '{{' + noticeBoardTitle + '/' + normalizedPageTitle + '}}',
						summary: apiPostSummaryforAfdPage,
						tags: 'Adiutor',
						format: 'json'
					} ).then( () => {
						if ( logNominations ) {
							addNominationToAfdLogPage( pageTitle );
						}
						adiutorUserOptions.stats.afdRequests++;
						api.postWithEditToken( {
							action: 'globalpreferences',
							format: 'json',
							optionname: 'userjs-adiutor-' + mw.config.get( 'wgWikiID' ),
							optionvalue: JSON.stringify( adiutorUserOptions ),
							formatversion: 2
						}, () => {
						} );
					} );
				}
			} );
		} else {
			if ( logNominations ) {
				addNominationToAfdLogPage( pageTitle );
			}
		}

		/**
		 * Append the nomination to the monthly AfD log if required.
		 *
		 * @param {string} targetPageTitle - The nominated page title.
		 */
		function addNominationToAfdLogPage( targetPageTitle ) {
			const date = new Date();
			const dateYear = date.getUTCFullYear();
			const monthName = localMonthsNames[ date.getUTCMonth() ];
			const day = date.getUTCDate();
			let pageContent;
			api.get( {
				action: 'parse',
				page: afdLogPage + dateYear + '_' + monthName + '_' + day,
				prop: 'wikitext',
				format: 'json'
			} ).then( ( data ) => {
				pageContent = data.parse.wikitext[ '*' ];
				const normalizedTargetTitle = targetPageTitle.replace( /_/g, ' ' );
				const nominationTemplate = '{{' + noticeBoardTitle + '/' +
						normalizedTargetTitle + '}}';
				const nominatedBefore = pageContent.includes( nominationTemplate );
				if ( !nominatedBefore ) {
					api.postWithToken( 'csrf', {
						action: 'edit',
						title: afdLogPage + dateYear + '_' + monthName + '_' + day,
						appendtext: '{{' + noticeBoardTitle + '/' + normalizedTargetTitle + '}}',
						summary: apiPostSummaryforAfdLog,
						tags: 'Adiutor',
						format: 'json'
					} ).then( () => {
						window.location = '/wiki/' + noticeBoardTitle + '/' + normalizedTargetTitle;
					} );
				} else {
					window.location = '/wiki/' + noticeBoardTitle + '/' + normalizedTargetTitle;
				}
			} );
		}

		/**
		 * Log the nomination on the user's personal log page when enabled.
		 *
		 * @return {void}
		 */
		function logNomination() {
			if ( adiutorUserOptions.speedyDeletion.afdLogNominatedPages === true ) {
				const currentDate = new Date();
				const currentMonthYear = currentDate.toLocaleString( localLangCode, {
					month: 'long',
					year: 'numeric'
				} );
				const userLogSectionTitle = '== ' + currentMonthYear + ' ==';
				const afdLogPageTitle = userPagePrefix.concat(
					mwConfig.wgUserName,
					String( '/' + adiutorUserOptions.speedyDeletion.afdLogPageName )
				).split( ' ' ).join( '_' );
				const csdLogPageTitle = userPagePrefix.concat(
					mwConfig.wgUserName,
					String( '/' + adiutorUserOptions.speedyDeletion.csdLogPageName )
				).split( ' ' ).join( '_' );
				let newContent;
				api.get( {
					action: 'parse',
					page: afdLogPageTitle,
					format: 'json',
					prop: 'wikitext'
				} ).then( ( data ) => {
					const pageContent = data.parse.wikitext[ '*' ];
					if ( pageContent.includes( userLogSectionTitle ) ) {
						newContent = pageContent.replace(
							userLogSectionTitle,
							userLogSectionTitle + '\n' +
									replaceParameter( userLogText, '1', pageTitle )
						);
					} else {
						newContent = pageContent + '\n\n' + userLogSectionTitle + '\n' +
								replaceParameter( userLogText, '1', pageTitle );
					}
					return api.postWithToken( 'csrf', {
						action: 'edit',
						title: csdLogPageTitle,
						text: newContent,
						summary: replaceParameter( apiPostSummaryforUserLog, '1', pageTitle ),
						tags: 'Adiutor',
						format: 'json'
					} );
				} ).catch( () => api.postWithToken( 'csrf', {
					action: 'edit',
					title: afdLogPageTitle,
					section: 'new',
					sectiontitle: userLogSectionTitle,
					text: replaceParameter( userLogText, '1', pageTitle ),
					summary: replaceParameter( apiPostSummaryforUserLog, '1', pageTitle ),
					format: 'json'
				} ) );
			}
		}

		/**
		 * Fetch the creator of the current page.
		 *
		 * @return {Promise} API response promise.
		 */
		function getCreator() {
			return api.get( {
				action: 'query',
				prop: 'revisions',
				rvlimit: 1,
				rvprop: [ 'user' ],
				rvdir: 'newer',
				titles: mwConfig.wgPageName.replace( /_/g, ' ' )
			} );
		}

		/**
		 * Notify the page creator about the AfD nomination.
		 *
		 * @param {string} author - Username of the page creator.
		 * @param {string} message - Message body to post.
		 * @return {void}
		 */
		function sendMessageToAuthor( author, message ) {
			api.postWithToken( 'csrf', {
				action: 'edit',
				title: userTalkPagePrefix + author,
				appendtext: '\n' + message,
				summary: replaceParameter( apiPostSummaryforCreator, '1', pageTitle ),
				tags: 'Adiutor',
				format: 'json'
			} ).then( () => {
			} );
		}

		/**
		 * Show a lightweight progress indicator while edits are queued.
		 *
		 * @return {void}
		 */
		function showProgress() {
			const processStartedDialog = new OO.ui.MessageDialog();
			const progressBar = new OO.ui.ProgressBarWidget();
			const processWindowManager = new OO.ui.WindowManager();
			$( document.body ).append( processWindowManager.$element );
			processWindowManager.addWindows( [ processStartedDialog ] );
			processWindowManager.openWindow( processStartedDialog, {
				title: mw.msg( 'processing' ),
				message: progressBar.$element
			} );
		}
	}

	module.exports = {
		callBack: callBack
	};

}() );
