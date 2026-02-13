/* <nowiki> */

/**
 * @file adiutor-upw.js
 * @description Userpage widget module displaying user rights and metadata, adapted from
 * existing tools.
 * @license CC BY-SA 4.0
 */

( function () {
	'use strict';

	/**
	 * Attach user page widgets.
	 *
	 * @return {void}
	 */
	function callBack() {
		const $body = $( document.body );
		const mwConfig = {
			wgNamespaceNumber: /** @type {number} */ ( mw.config.get( 'wgNamespaceNumber' ) ),
			wgPageName: /** @type {string} */ ( mw.config.get( 'wgPageName' ) ),
			wgUserName: /** @type {string|null} */ ( mw.config.get( 'wgUserName' ) ),
			wgTitle: /** @type {string} */ ( mw.config.get( 'wgTitle' ) ),
			wgUserGroups: /** @type {Array<string>} */ ( mw.config.get( 'wgUserGroups' ) )
		};

		if (
			( mwConfig.wgNamespaceNumber === 2 || mwConfig.wgNamespaceNumber === 3 ) &&
			!( /\//.test( mwConfig.wgTitle ) )
		) {
			mw.loader.using( [ 'mediawiki.util' ], () => {
				$( () => {
					const encodedTitle = mw.util.rawurlencode( mwConfig.wgTitle );
					const apiUrl = mw.config.get( 'wgScriptPath' ) +
						'/api.php?format=json&action=query&list=blocks|users|usercontribs' +
						'&usprop=blockinfo|editcount|gender|registration|groups' +
						'&uclimit=1&ucprop=timestamp&ususers=' + encodedTitle +
						'&ucuser=' + encodedTitle + '&bkusers' + encodedTitle +
						'&meta=allmessages&amfilter=grouppage';
					$.getJSON( apiUrl ).then( ( queryResult ) => {
						if ( !queryResult.query ) {
							return;
						}
						const groupPages = {};
						let user;
						let invalidUser;
						let missingUser;
						let userGroups;
						let editCount;
						let registrationDate;
						let isBlocked;
						let isPartialBlocked;
						let gender;
						let lastEditedDate;
						try {
							user = queryResult.query.users[ 0 ];
							invalidUser = typeof user.invalid !== 'undefined';
							missingUser = typeof user.missing !== 'undefined';
							userGroups = Array.isArray( user.groups ) ? user.groups : [];
							editCount = typeof user.editcount === 'number' ? user.editcount : null;
							registrationDate = typeof user.registration === 'string' ?
								new Date( user.registration ) : null;
							isBlocked = typeof user.blockedby !== 'undefined';
							isPartialBlocked = typeof user.blockpartial !== 'undefined';
							gender = typeof user.gender === 'string' ? user.gender : null;
							if (
								typeof queryResult.query.usercontribs[ 0 ] === 'object' &&
								typeof queryResult.query.usercontribs[ 0 ].timestamp === 'string'
							) {
								lastEditedDate = new Date(
									queryResult.query.usercontribs[ 0 ].timestamp
								);
							}
							for ( let i = 0; i < queryResult.query.allmessages.length; i++ ) {
								const groupPageKey = queryResult.query.allmessages[ i ].name
									.replace( 'grouppage-', '' );
								groupPages[ groupPageKey ] = queryResult.query.allmessages[ i ][ '*' ]
									.replace(
										'{{ns:project}}:',
										mw.config.get( 'wgSiteName' ) + ':'
									);
							}
						} catch ( e ) {
							return;
						}
						let statusText = '';
						let isIpUser = false;
						let isIPv4User = false;
						let isIPv6User = false;
						let blockText = '';
						if ( isBlocked ) {
							if ( isPartialBlocked ) {
								blockText = mw.msg( 'partially-blocked' );
							} else {
								blockText = mw.msg( 'blocked' );
							}
							statusText += '<a href="' + mw.config.get( 'wgScriptPath' ) +
								'/index.php?title=Special:Log&amp;page=' +
								mw.util.rawurlencode(
									mw.config.get( 'wgFormattedNamespaces' )[ 2 ] + ':' + user.name
								) + '&amp;type=block">' + blockText + '</a> ';
						}
						if ( missingUser ) {
							statusText += mw.msg( 'username-not-registered' );
						} else if ( invalidUser ) {
							isIPv4User = mw.util.isIPv4Address( user.name );
							isIPv6User = mw.util.isIPv6Address( user.name );
							isIpUser = isIPv4User || isIPv6User;
							if ( isIPv4User ) {
								statusText += mw.msg( 'anonymous-ipv4-user' );
							} else if ( isIPv6User ) {
								statusText += mw.msg( 'anonymous-ipv6-user' );
							} else {
								statusText += mw.msg( 'invalid-username' );
							}
						} else {
							const friendlyGroupNames = {
								'*': false,
								user: false,
								autoconfirmed: false,
								sysop: mw.msg( 'friendly-group-names-sysop' ),
								accountcreator: mw.msg( 'friendly-group-names-accountcreator' ),
								import: mw.msg( 'friendly-group-names.import' ),
								'interface-editor': mw.msg( 'friendly-group-names-interface-editor' ),
								'interface-admin': mw.msg( 'friendly-group-names-interface-admin' ),
								patroller: mw.msg( 'friendly-group-names-patroller' ),
								autoreview: mw.msg( 'friendly-group-names-autoreview' ),
								bureaucrat: mw.msg( 'friendly-group-names-bureaucrat' ),
								transwiki: mw.msg( 'friendly-group-names-transwiki' ),
								'ipblock-exempt': mw.msg( 'friendly-group-names-ipblock-exempt' ),
								checkuser: mw.msg( 'friendly-group-names-checkuser' ),
								suppress: mw.msg( 'friendly-group-names-suppress' ),
								confirmed: mw.msg( 'friendly-group-names-confirmed' ),
								abusefilter: mw.msg( 'friendly-group-names-abusefilter' ),
								autoreviewer: mw.msg( 'friendly-group-names-autoreviewer' ),
								epcoordinator: mw.msg( 'friendly-group-names-epcoordinator' ),
								epcampus: mw.msg( 'friendly-group-names-epcampus' ),
								eponline: mw.msg( 'friendly-group-names-eponline' ),
								filemover: mw.msg( 'friendly-group-names-filemover' ),
								'massmessage-sender': mw.msg( 'friendly-group-names-massmessage-sender' ),
								templateeditor: mw.msg( 'friendly-group-names-templateeditor' )
							};
							const friendlyGroups = [];
							for ( let i = 0; i < userGroups.length; i++ ) {
								const groupName = userGroups[ i ];
								if ( groupName === 'named' ) {
									continue;
								}
								const groupPage = groupPages[ groupName ] || groupName;
								if (
									Object.prototype.hasOwnProperty.call(
										friendlyGroupNames,
										groupName
									)
								) {
									if ( friendlyGroupNames[ groupName ] ) {
										friendlyGroups.push(
											"<a href='/wiki/" + mw.util.rawurlencode( groupPage ) +
											"'>" + friendlyGroupNames[ groupName ] + '</a>'
										);
									}
								} else {
									friendlyGroups.push(
										"<a href='/wiki/" + mw.util.rawurlencode( groupPage ) +
										"'>" + groupName + '</a>'
									);
								}
							}
							switch ( friendlyGroups.length ) {
								case 0:
									statusText += isBlocked ? mw.msg( 'user' ) : mw.msg( 'registered-user' );
									break;
								case 1:
									statusText += friendlyGroups[ 0 ];
									break;
								case 2:
									statusText += friendlyGroups[ 0 ] + ' ' + mw.msg( 'and' ) +
										' ' + friendlyGroups[ 1 ];
									break;
								default: {
									const groupList = friendlyGroups.slice( 0, -1 ).join( ', ' );
									statusText += groupList + ', ' + mw.msg( 'and' ) + ' ' +
										friendlyGroups[ friendlyGroups.length - 1 ];
									break;
								}
							}
						}
						if ( registrationDate ) {
							statusText += ', ' + mw.msg(
								'registration-info',
								formatRelativeDateDifference( registrationDate )
							);
						}
						statusText = mw.msg( 'this' ) + ' ' + statusText;
						const firstHeading = document.getElementById( 'firstHeading' ) ||
							document.getElementById( 'section-0' );
						if ( !firstHeading ) {
							return;
						}
						/* eslint-disable jsdoc/valid-types */
						/**
						 * @class ps-blocked
						 * @class ps-anonymous
						 * @class ps-invalid
						 * @class ps-registered
						 * @class ps-group-*
						 * @class ps-gender-*
						 */
						/* eslint-enable jsdoc/valid-types */
						const newClasses = [];
						if ( isBlocked ) {
							newClasses.push( 'ps-blocked' );
						}
						if ( isIpUser ) {
							newClasses.push( 'ps-anonymous' );
						} else if ( invalidUser ) {
							newClasses.push( 'ps-invalid' );
						} else {
							newClasses.push( 'ps-registered' );
						}
						// eslint-disable-next-line mediawiki/class-doc
						firstHeading.className += ( firstHeading.className.length ? ' ' : '' ) +
								userGroups.map( ( group ) => 'ps-group-' + group )
									.concat( newClasses )
									.join( ' ' );
						const genderSpan = document.createElement( 'span' );
						genderSpan.id = 'ps-gender-' + ( gender || 'unknown' );
						genderSpan.style.paddingLeft = '0.25em';
						genderSpan.style.fontSize = '75%';
						let genderSymbol = '';
						switch ( gender ) {
							case 'male':
								genderSymbol = '\u2642';
								break;
							case 'female':
								genderSymbol = '\u2640';
								break;
							default:
								genderSymbol = '';
								break;
						}
						genderSpan.textContent = genderSymbol;
						/**
						 * @class adiutor-user-page-username-details
						 * @class adiutor-user-page-change-count
						 * @class adiutor-user-page-button-group
						 * @class adiutor-user-page-box-container
						 * @class adiutor-user-page-container
						 */
						const usernameHtml = '<strong class="username">' + user.name +
								'</strong><br>' + statusText;
						const userPageUsernameDetails = new OO.ui.MessageWidget( {
							type: 'success',
							icon: 'userRights',
							inline: false,
							label: new OO.ui.HtmlSnippet( usernameHtml ),
							classes: [ 'adiutor-user-page-username-details' ]
						} );
						let lastEditedText = mw.msg( 'last-edited-default' );
						if ( lastEditedDate ) {
							lastEditedText = mw.msg( 'last-edited', formatRelativeDateDifference( lastEditedDate ) );
						}
						const editCountHtml = '<strong>' +
								mw.msg( 'has-x-edit-count', formatQuantityWithCommas( editCount ) ) +
								'</strong><br>' + lastEditedText + '.';
						const userPageChangeCount = new OO.ui.MessageWidget( {
							type: 'notice',
							icon: 'edit',
							inline: false,
							label: new OO.ui.HtmlSnippet( editCountHtml ),
							classes: [ 'adiutor-user-page-change-count' ]
						} );
						const unblockButton = new OO.ui.ButtonWidget( {
							icon: 'unBlock',
							label: mw.msg( 'unblock-button-label' ),
							flags: [ 'destructive' ]
						} );
						const blockButton = new OO.ui.ButtonWidget( {
							icon: 'block',
							label: mw.msg( 'block-button-label' ),
							flags: [ 'destructive' ]
						} );
						const warnUserButton = new OO.ui.ButtonWidget( {
							icon: 'hand',
							label: mw.msg( 'warn-button-label' )
						} );
						const userContributions = new OO.ui.ButtonWidget( {
							icon: 'edit',
							label: mw.msg( 'contributions-button-label' )
						} );
						warnUserButton.on( 'click', () => {
							loadAdiutorModule( 'WRN' );
						} );
						userContributions.on( 'click', () => {
							window.location.href = '/wiki/Special:Contributions/' + mw.util.rawurlencode( user.name );
						} );
						unblockButton.on( 'click', () => {
							window.location.href = '/wiki/Special:Unblock/' + mw.util.rawurlencode( user.name );
						} );
						let userPageActionButtons;
						if ( mwConfig.wgPageName.includes( mwConfig.wgUserName ) ) {
							userPageActionButtons = new OO.ui.ButtonGroupWidget( {
								items: [ userContributions ],
								classes: [ 'adiutor-user-page-button-group' ]
							} );
						} else {
							userPageActionButtons = new OO.ui.ButtonGroupWidget( {
								items: [ warnUserButton, userContributions ],
								classes: [ 'adiutor-user-page-button-group' ]
							} );
							if ( mwConfig.wgUserGroups.includes( 'sysop' ) ) {
								if ( isBlocked ) {
									userPageActionButtons.addItems( [ unblockButton ] );
								} else {
									userPageActionButtons.addItems( [ blockButton ] );
								}
								blockButton.on( 'click', () => {
									loadAdiutorModule( 'UBM' );
								} );
							}
						}
						const userPageUserDetailStack = new OO.ui.StackLayout( {
							items: [
								userPageUsernameDetails,
								userPageChangeCount,
								userPageActionButtons
							],
							continuous: true,
							classes: [ 'adiutor-user-page-box-container' ]
						} );
						let userPanelStack;
						if ( isBlocked ) {
							let blockedUserSection;
							if ( isPartialBlocked ) {
								const partialBlockHtml = '<strong>' +
										mw.msg( 'user-partially-blocked-title' ) +
										'</strong><br>' + mw.msg(
									'user-partially-blocked',
									user.blockedtimestampformatted,
									user.blockreason,
									user.blockedby
								);
								blockedUserSection = new OO.ui.MessageWidget( {
									type: 'warning',
									icon: 'block',
									label: new OO.ui.HtmlSnippet( partialBlockHtml )
								} );
							} else {
								const blockHtml = '<strong>' +
										mw.msg( 'user-blocked-message-title' ) +
										'</strong><br>' + mw.msg(
									'user-blocked-message',
									user.blockedtimestampformatted,
									user.blockreason,
									user.blockedby
								);
								blockedUserSection = new OO.ui.MessageWidget( {
									type: 'error',
									icon: 'block',
									label: new OO.ui.HtmlSnippet( blockHtml )
								} );
							}
							userPanelStack = new OO.ui.StackLayout( {
								items: [ userPageUserDetailStack, blockedUserSection ],
								continuous: true,
								classes: [ 'adiutor-user-page-container' ]
							} );
						} else {
							userPanelStack = new OO.ui.StackLayout( {
								items: [ userPageUserDetailStack ],
								continuous: true,
								classes: [ 'adiutor-user-page-container' ]
							} );
						}
						$body.find( '#bodyContent' ).prepend( userPanelStack.$element );
					} );
				} );
			} );
		}
	}

	function formatQuantityWithCommas( number ) {
		return String( number ).replace( /\d{1,3}(?=(\d{3})+(?!\d))/g, '$&,' );
	}

	function formatRelativeDateDifference( oldDate ) {
		const currentTime = Date.now();
		const ageInMilliseconds = currentTime - oldDate.getTime();
		let ageNumber;
		let ageKey;
		if ( ageInMilliseconds < 60000 ) {
			ageNumber = Math.floor( ageInMilliseconds / 1000 );
			ageKey = 'second';
		} else if ( ageInMilliseconds < 3600000 ) {
			ageNumber = Math.floor( ageInMilliseconds / 60000 );
			ageKey = 'minute';
		} else if ( ageInMilliseconds < 86400000 ) {
			ageNumber = Math.floor( ageInMilliseconds / 3600000 );
			ageKey = 'hour';
		} else if ( ageInMilliseconds < 604800000 ) {
			ageNumber = Math.floor( ageInMilliseconds / 86400000 );
			ageKey = 'day';
		} else if ( ageInMilliseconds < 2592000000 ) {
			ageNumber = Math.floor( ageInMilliseconds / 604800000 );
			ageKey = 'week';
		} else if ( ageInMilliseconds < 31536000000 ) {
			ageNumber = Math.floor( ageInMilliseconds / 2592000000 );
			ageKey = 'month';
		} else {
			ageNumber = Math.floor( ageInMilliseconds / 31536000000 );
			ageKey = 'year';
		}
		const ageForm = ageNumber === 1 ? 'one' : 'other';
		// Messages: relative-date-second-one, relative-date-second-other,
		// relative-date-minute-one, relative-date-minute-other,
		// relative-date-hour-one, relative-date-hour-other,
		// relative-date-day-one, relative-date-day-other,
		// relative-date-week-one, relative-date-week-other,
		// relative-date-month-one, relative-date-month-other,
		// relative-date-year-one, relative-date-year-other
		// eslint-disable-next-line mediawiki/msg-doc
		return mw.msg( 'relative-date-' + ageKey + '-' + ageForm, ageNumber );
	}

	const moduleRegistry = {
		UBM: require( './adiutor-ubm.js' ),
		WRN: require( './adiutor-wrn.js' )
	};

	function loadAdiutorModule( moduleName ) {
		const moduleExports = moduleRegistry[ moduleName ];
		if ( moduleExports && moduleExports.callBack ) {
			moduleExports.callBack();
		}
	}

	module.exports = {
		callBack: callBack
	};
}() );

/* </nowiki> */
