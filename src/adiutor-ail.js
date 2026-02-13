/* <nowiki> */

/**
 * @file adiutor-ail.js
 * @description Interface launcher module for the Adiutor gadget, initializing UI and core tools.
 * @license CC BY-SA 4.0
 * @see https://meta.wikimedia.org/wiki/Adiutor
 * @author Doğu Abaris <abaris@null.net>
 */

/**
 * @typedef {Object} Revision
 * @property {string} user
 */

/**
 * @typedef {Object} PageData
 * @property {Revision[]} revisions
 */

/**
 * @typedef {Object} PageRevision
 * @property {string} user
 */

/**
 * @typedef {Object} PageData
 * @property {PageRevision[]} revisions
 */

/**
 * @typedef {Object} QueryResponse
 * @property {Object.<string, PageData>} pages
 */

/**
 * @typedef {Object} ApiResponse
 * @property {QueryResponse} query
 */

( function () {
	'use strict';

	/**
	 * Initialize the Adiutor interface launcher and menu.
	 *
	 * Attaches menu buttons, preloads requested modules, and routes menu choices
	 * to the appropriate module entry points.
	 */
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
		const $body = $( document.body );

		/**
		 * MediaWiki config variables.
		 *
		 * @typedef {Object} MwConfig
		 * @property {string} skin
		 * @property {string} wgPageName
		 * @property {number} wgNamespaceNumber
		 * @property {string|null} wgUserName
		 * @property {Array<string>} wgUserGroups
		 * @property {string|undefined} wgCanonicalSpecialPageName
		 *
		 * @type {MwConfig}
		 */
		const mwConfig = {
			skin: /** @type {string} */ ( mw.config.get( 'skin' ) ),
			wgPageName: /** @type {string} */ ( mw.config.get( 'wgPageName' ) ),
			wgNamespaceNumber: /** @type {number} */ ( mw.config.get( 'wgNamespaceNumber' ) ),
			wgUserName: /** @type {string|null} */ ( mw.config.get( 'wgUserName' ) ),
			wgUserGroups: /** @type {Array<string>} */ ( mw.config.get( 'wgUserGroups' ) ),
			wgCanonicalSpecialPageName: /** @type {string|undefined} */ (
				mw.config.get( 'wgCanonicalSpecialPageName' )
			)
		};

		const moduleRegistry = {
			AFD: require( './adiutor-afd.js' ),
			AIV: require( './adiutor-aiv.js' ),
			BDM: require( './adiutor-bdm.js' ),
			CMR: require( './adiutor-cmr.js' ),
			COV: require( './adiutor-cov.js' ),
			CSD: require( './adiutor-csd.js' ),
			DEL: require( './adiutor-del.js' ),
			INF: require( './adiutor-inf.js' ),
			OPT: require( './adiutor-opt.js' ),
			PMR: require( './adiutor-pmr.js' ),
			PRD: require( './adiutor-prd.js' ),
			RDR: require( './adiutor-rdr.js' ),
			RPP: require( './adiutor-rpp.js' ),
			SUM: require( './adiutor-sum.js' ),
			TAG: require( './adiutor-tag.js' ),
			UBM: require( './adiutor-ubm.js' ),
			UPW: require( './adiutor-upw.js' ),
			WRN: require( './adiutor-wrn.js' )
		};

		let blockButtonGroup, blockedAlready, blockThisUser;
		const defaultMenuItems = [];
		const miscellaneousConfigurations = {
			csdCategory: 'Candidates_for_speedy_deletion_as_spam',
			userBlockRequestNoticeBoard: 'Administrator_intervention_against_vandalism',
			afdNoticeBoard: 'Articles_for_deletion',
			mainPage: 'Main_Page'
		};
		switch ( mwConfig.wgNamespaceNumber ) {
			case -1:
			case 0:
			case 1:
			case 2:
			case 3:
			case 4:
			case 5:
			case 6:
			case 7:
			case 14:
			case 10:
			case 11:
			case 100:
			case 101:
			case 102:
			case 103:
			case 828:
			case 829: {
			// LOAD MODULES
				if ( mwConfig.wgNamespaceNumber === 3 ) {
					const userParams = {
						action: 'query',
						meta: 'userinfo',
						uiprop: 'rights',
						format: 'json'
					};
					api.get( userParams ).then( ( data ) => {
						checkMentor( data.query.userinfo.id );
					} );
				}
				if ( mwConfig.wgUserGroups.includes( 'sysop' ) ) {
					if ( !mwConfig.wgCanonicalSpecialPageName ) {
						defaultMenuItems.push( new OO.ui.MenuOptionWidget( {
							icon: 'trash',
							data: 'delete',
							label: OO.ui.deferMsg( 'delete' ),
							flags: [ 'destructive' ],
							classes: [ 'adiutor-top-user-menu-end' ]
						} ) );
						if ( mwConfig.wgNamespaceNumber !== 0 ) {
							if (
								mwConfig.wgPageName.includes(
									miscellaneousConfigurations.csdCategory
								)
							) {
								defaultMenuItems.push( new OO.ui.MenuOptionWidget( {
									icon: 'trash',
									data: 'batch-delete',
									label: OO.ui.deferMsg( 'batch-delete' ),
									flags: [ 'destructive' ],
									classes: [ 'adiutor-top-user-menu-end' ]
								} ) );
							}
							if (
								mwConfig.wgPageName.includes(
									miscellaneousConfigurations.userBlockRequestNoticeBoard
								)
							) {
								$body.find( '.mw-editsection-like' ).each( function () {
									blockButtonGroup = new OO.ui.ButtonGroupWidget( {
										items: [
											blockedAlready = new OO.ui.ButtonWidget( {
												framed: false,
												icon: 'tray',
												label: mw.msg( 'blocked' )
											} ),
											blockThisUser = new OO.ui.ButtonWidget( {
												framed: false,
												flags: [ 'destructive' ],
												icon: 'block',
												label: mw.msg( 'block-button-label' )
											} )
										]
									} );
									blockButtonGroup.$element.css( {
										'margin-left': '20px'
									} );
									$( this ).append( blockButtonGroup.$element );
									blockThisUser.on( 'click', () => {
										const $sectionElement = $( this ).closest( '.ext-discussiontools-init-section' );
										const $headlineElement = $sectionElement.find( '.mw-headline' );
										const headlineText = $headlineElement.text();
										const dateRegex = /\d{2}-\d{2}-\d{4}/;
										window.adiutorUserToBlock = headlineText.replace( dateRegex, '' ).trim();
										window.sectionId = new URL(
											$sectionElement.find( '.mw-editsection a' ).attr( 'href' )
										).searchParams.get( 'section' );
										loadAdiutorModule( 'UBM' );
									} );
									blockedAlready.on( 'click', () => {
										const $sectionElement = $( this ).closest( '.ext-discussiontools-init-section' );
										const $headlineElement = $sectionElement.find( '.mw-headline' );
										const sectionId = new URL(
											$sectionElement.find( '.mw-editsection a' ).attr( 'href' )
										).searchParams.get( 'section' );
										window.sectionId = sectionId;
										api.postWithToken( 'csrf', {
											action: 'edit',
											title: mwConfig.wgPageName,
											section: sectionId,
											text: '',
											summary: mw.msg( 'blocked-user-removed-from-the-noticeboard' ),
											tags: 'Adiutor',
											format: 'json'
										} ).then( () => {
											$headlineElement.css( 'text-decoration', 'line-through' );
										} );
									} );
								} );
							}
						}
					}
					if (
						mwConfig.wgCanonicalSpecialPageName === 'Contributions' ||
							mwConfig.wgNamespaceNumber === 2 ||
							mwConfig.wgNamespaceNumber === 3 &&
							!mwConfig.wgPageName.includes( mwConfig.wgUserName )
					) {
						if ( mwConfig.wgUserGroups.includes( 'sysop' ) ) {
							defaultMenuItems.push( new OO.ui.MenuOptionWidget( {
								icon: 'block',
								data: 'block',
								label: OO.ui.deferMsg( 'block' ),
								classes: [ 'adiutor-top-user-menu-end' ]
							} ) );
						}
					}
				}
				if ( mwConfig.wgUserGroups.includes( 'sysop' ) ) {
					if ( /[?&](?:action|diff|oldid)=/.test( window.location.href ) ) {
						defaultMenuItems.push( new OO.ui.MenuOptionWidget( {
							icon: 'cancel',
							data: 'rdr',
							label: OO.ui.deferMsg( 'create-revision-deletion-request' ),
							classes: [ 'adiutor-top-rrd-menu' ]
						} ) );
					}
				}
				if (
					mwConfig.wgCanonicalSpecialPageName === 'Contributions' ||
						mwConfig.wgNamespaceNumber === 2 ||
						mwConfig.wgNamespaceNumber === 3 &&
						!mwConfig.wgPageName.includes( mwConfig.wgUserName )
				) {
					defaultMenuItems.push(
						new OO.ui.MenuOptionWidget( {
							icon: 'cancel',
							data: 'report',
							label: OO.ui.deferMsg( 'report' ),
							classes: [ 'adiutor-top-user-menu-end' ]
						} ),
						new OO.ui.MenuOptionWidget( {
							icon: 'hand',
							data: 'warn',
							label: OO.ui.deferMsg( 'warn' ),
							classes: [ 'adiutor-top-user-menu-end' ]
						} )
					);
				}
				if ( !mwConfig.wgCanonicalSpecialPageName ) {
					defaultMenuItems.push( new OO.ui.MenuOptionWidget( {
						icon: 'add',
						data: 1,
						label: mw.msg( 'create-speedy-deletion-request' )
					} ), new OO.ui.MenuOptionWidget( {
						icon: 'add',
						data: 2,
						label: mw.msg( 'proposed-deletion-nomination' )
					} ), new OO.ui.MenuOptionWidget( {
						icon: 'add',
						data: 3,
						label: mw.msg( 'nominate-article-for-deletion' )
					} ), new OO.ui.MenuOptionWidget( {
						icon: 'arrowNext',
						data: 'pmr',
						label: mw.msg( 'page-move-request' )
					} ), new OO.ui.MenuOptionWidget( {
						icon: 'lock',
						data: 'rpp',
						label: mw.msg( 'page-protection-request' )
					} ), new OO.ui.MenuOptionWidget( {
						icon: 'history',
						data: 4,
						label: mw.msg( 'recent-changes' )
					} ), new OO.ui.MenuOptionWidget( {
						icon: 'templateAdd',
						data: 'tag',
						label: mw.msg( 'tag-page' )
					} ), new OO.ui.MenuOptionWidget( {
						icon: 'checkAll',
						data: 5,
						label: mw.msg( 'copyright-violation-check' )
					} ), new OO.ui.MenuOptionWidget( {
						icon: 'info',
						data: 7,
						label: mw.msg( 'article-info' )
					} ), new OO.ui.MenuOptionWidget( {
						icon: 'settings',
						data: 6,
						label: mw.msg( 'adiutor-settings' ),
						classes: [ 'adiutor-top-settings-menu' ]
					} ) );
				}
				if ( mwConfig.wgCanonicalSpecialPageName ) {
					defaultMenuItems.push( new OO.ui.MenuOptionWidget( {
						icon: 'settings',
						data: 6,
						label: mw.msg( 'adiutor-settings' ),
						classes: [ 'adiutor-top-settings-menu' ]
					} ) );
				}
				const adiutorMenu = new OO.ui.ButtonMenuSelectWidget( {
					icon: 'ellipsis',
					invisibleLabel: true,
					framed: false,
					title: 'More options',
					align: 'force-right',
					classes: [ 'adiutor-top-selector', 'mw-indicator' ],
					menu: {
						horizontalPosition: 'end',
						items: defaultMenuItems,
						classes: [ 'adiutor-top-menu' ]
					}
				} );
				adiutorMenu.$element.on( 'mouseover', () => {
					adiutorMenu.getMenu().toggle( true );
				} );
				adiutorMenu.$element.on( 'mouseout', ( event ) => {
					if (
						!event.relatedTarget ||
							!$( event.relatedTarget ).closest(
								'.adiutor-top-selector, .adiutor-top-menu'
							).length
					) {
						adiutorMenu.getMenu().toggle( false );
					}
				} );
				$( document ).on( 'mouseout', ( event ) => {
					if (
						!event.relatedTarget ||
							!$( event.relatedTarget ).closest(
								'.adiutor-top-selector, .adiutor-top-menu'
							).length
					) {
						adiutorMenu.getMenu().toggle( false );
					}
				} );
				adiutorMenu.getMenu().on( 'choose', ( menuOption ) => {
					const optionMapping = {
						1: 'CSD',
						2: 'PRD',
						3: 'AFD',
						4: 'diff',
						5: 'COV',
						6: 'OPT',
						7: 'INF',
						report: 'AIV',
						block: 'UBM',
						warn: 'WRN',
						rdr: 'RDR',
						pmr: 'PMR',
						rpp: 'RPP',
						tag: 'TAG',
						gan: 'GAN',
						fan: 'FAN',
						delete: 'DEL',
						'batch-delete': 'BDM'
					};
					const selectedOption = optionMapping[ menuOption.getData() ];
					if ( selectedOption === 'diff' ) {
						window.location = '/w/index.php?title=' + mwConfig.wgPageName +
							'&diff=cur&oldid=prev&diffmode=source';
					} else if ( selectedOption === 'welcome' ) {
						mw.notify( 'Coming soon :)'.text(), {
							title: mw.msg( 'warning' ),
							type: 'warning'
						} );
					} else {
						if ( document.activeElement &&
							typeof document.activeElement.blur === 'function'
						) {
							document.activeElement.blur();
						}
						loadAdiutorModule( selectedOption );
					}
				} );
				if ( !mwConfig.wgPageName.includes( miscellaneousConfigurations.mainPage ) ) {
					if ( mwConfig.wgNamespaceNumber === 2 ) {
						loadAdiutorModule( 'UPW' );
					}
					if (
						mwConfig.wgNamespaceNumber === 0 &&
							window.location.href.indexOf( 'action=' ) === -1
					) {
						if ( adiutorUserOptions.inlinePageInfo === true ) {
							loadAdiutorModule( 'INF' );
						}
					}
					if ( mwConfig.wgNamespaceNumber === 4 ) {
						if (
							mwConfig.wgPageName.includes(
								miscellaneousConfigurations.afdNoticeBoard
							)
						) {
							// This module is currently being made localizable.
							// loadAdiutorModule( 'AFD-Helper' );
						}
					}
					switch ( mwConfig.skin ) {
						case 'vector':
							$body.find( '.mw-portlet-cactions' ).parent().append( adiutorMenu.$element );
							break;
						case 'vector-2022':
							$body.find( '.vector-collapsible' ).append( adiutorMenu.$element );
							break;
						case 'monobook':
							$body.find( '#pt-notifications-notice' ).append( adiutorMenu.$element );
							break;
						case 'timeless':
							$body.find( '#p-cactions-label' ).append( adiutorMenu.$element );
							break;
						case 'minerva':
							$body.find( '.page-actions-menu__list' ).append( adiutorMenu.$element );
							break;
					}
					break;
				}
			}
		}
		if ( adiutorUserOptions.showEditSummaries === true ) {
			loadAdiutorModule( 'SUM' );
		}

		/**
		 * Dynamically invoke a named Adiutor module (if present in the registry).
		 *
		 * @param {string} moduleName - Short module key, e.g. 'AFD', 'AIV'.
		 * @return {void}
		 */
		function loadAdiutorModule( moduleName ) {
			const moduleExports = moduleRegistry[ moduleName ];
			if ( moduleExports && moduleExports.callBack ) {
				moduleExports.callBack();
			}
		}

		/**
		 * Check if the current user is listed as a Growth mentor and preload CMR when needed.
		 *
		 * @param {number} userId - User ID of the current account.
		 * @return {void}
		 */
		function checkMentor( userId ) {
			api.get( {
				action: 'parse',
				page: 'MediaWiki:GrowthMentors.json',
				prop: 'wikitext',
				format: 'json'
			} ).then( ( data ) => {
				if (
					data.parse.wikitext[ '*' ].includes( userId ) &&
					mwConfig.wgPageName.includes( mwConfig.wgUserName )
				) {
					loadAdiutorModule( 'CMR' );
				}
			} );
		}
	}

	module.exports = {
		callBack: callBack
	};

}() );
