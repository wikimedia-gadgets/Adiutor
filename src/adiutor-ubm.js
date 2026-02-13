/* <nowiki> */

/**
 * @file adiutor-ubm.js
 * @description User block module for initiating and logging user blocks via Adiutor.
 * @license CC BY-SA 4.0
 */

( function () {
	'use strict';

	/**
	 * Open user block dialog.
	 *
	 * @return {void}
	 */
	function callBack() {
		/** @type {mw.Api} */
		const api = new mw.Api();

		const mwConfig = {
			wgAction: /** @type {string} */ ( mw.config.get( 'wgAction' ) ),
			wgPageName: /** @type {string} */ ( mw.config.get( 'wgPageName' ) ),
			wgTitle: /** @type {string} */ ( mw.config.get( 'wgTitle' ) ),
			wgUserName: /** @type {string|null} */ ( mw.config.get( 'wgUserName' ) )
		};

		/**
		 * @typedef {Object} UbmConfiguration
		 * @property {{ data: string, label: string }[]} blockDurations
		 * @property {{ data: string, label: string }[]} blockReasons
		 * @property {string} userPagePrefix
		 * @property {string} userTalkPagePrefix
		 * @property {string} specialContributions
		 * @property {string} noticeBoardTitle
		 * @property {string} apiPostSummary
		 */

		/** @type {UbmConfiguration} */
		const ubmConfiguration = require( './adiutor-ubm.json' );

		if ( !ubmConfiguration ) {
			mw.notify( 'MediaWiki:Gadget-adiutor-ubm.json data is empty or undefined.', {
				title: mw.msg( 'operation-failed' ),
				type: 'error'
			} );
			return;
		}

		let duration;
		let blockReason;
		let additionalReason = '';
		let preventAccountCreationValue;
		let preventEmailSendingValue;
		let preventEditOwnTalkPageValue;
		const blockDurations = ubmConfiguration.blockDurations;
		const blockReasons = ubmConfiguration.blockReasons;
		const userPagePrefix = ubmConfiguration.userPagePrefix;
		const userTalkPagePrefix = ubmConfiguration.userTalkPagePrefix;
		const specialContributions = ubmConfiguration.specialContributions;
		const noticeBoardTitle = ubmConfiguration.noticeBoardTitle;
		const apiPostSummary = ubmConfiguration.apiPostSummary;
		let userToBlock = window.adiutorUserToBlock;
		const headlineElement = window.headlineElement;
		const sectionId = window.sectionId;
		if ( !userToBlock ) {
			userToBlock = getFormattedPageName();
		}

		function UserBlockDialog( config ) {
			UserBlockDialog.super.call( this, config );
		}

		OO.inheritClass( UserBlockDialog, OO.ui.ProcessDialog );
		UserBlockDialog.static.title = mw.msg( 'user-blocking' ) + ' (' + userToBlock + ')';
		UserBlockDialog.static.name = 'UserBlockDialog';
		UserBlockDialog.static.actions = [ {
			action: 'continue',
			modes: 'edit',
			label: OO.ui.deferMsg( 'block' ),
			flags: [ 'primary', 'destructive' ]
		}, {
			action: 'about',
			modes: 'edit',
			label: 'Adiutor'
		}, {
			modes: 'edit',
			label: OO.ui.deferMsg( 'cancel' ),
			flags: 'safe'
		}, {
			action: 'back',
			modes: 'help',
			label: OO.ui.deferMsg( 'back' ),
			flags: 'safe'
		} ];

		UserBlockDialog.prototype.initialize = function () {
			UserBlockDialog.super.prototype.initialize.apply( this, arguments );
			this.userBlockPanel = new OO.ui.PanelLayout( {
				padded: true,
				expanded: false
			} );
			const durationDropdown = new OO.ui.DropdownWidget( {
				menu: {
					items: blockDurations.map( ( durationOption ) => new OO.ui.MenuOptionWidget( {
						data: durationOption.data,
						label: durationOption.label
					} ) )
				},
				label: mw.message( 'choose-duration' ).text()
			} );

			const reasonInput = new OO.ui.MultilineTextInputWidget( {
				placeholder: mw.message( 'please-choose-block-rationale' ).text()
			} );
			const reasonDropdown = new OO.ui.DropdownWidget( {
				menu: {
					items: blockReasons.map( ( reason ) => new OO.ui.MenuOptionWidget( {
						data: reason.data,
						label: reason.label
					} ) )
				},
				label: mw.message( 'choose-reason' ).text()
			} );

			durationDropdown.getMenu().on( 'choose', ( menuOption ) => {
				duration = menuOption.data;
			} );
			reasonDropdown.getMenu().on( 'choose', ( menuOption ) => {
				blockReason = menuOption.data;
			} );
			reasonInput.on( 'change', () => {
				additionalReason = ' | ' + mw.msg( 'additional-rationale' ) + ': ' + reasonInput.getValue();
			} );

			const fieldset = new OO.ui.FieldsetLayout( {} );
			const preventAccountCreationCheckbox = new OO.ui.CheckboxInputWidget( {
				selected: true
			} );
			const preventEmailSendingCheckbox = new OO.ui.CheckboxInputWidget( {
				selected: false
			} );
			const preventEditOwnTalkPageCheckbox = new OO.ui.CheckboxInputWidget( {
				selected: false
			} );
			const additionalOptionsFieldset = new OO.ui.FieldsetLayout( {
				label: mw.message( 'additional-options' ).text(),
				padded: true
			} );
			additionalOptionsFieldset.$element.addClass( 'additional-options-fieldset' );
			additionalOptionsFieldset.$element.css( {
				'margin-top': '20px'
			} );
			additionalOptionsFieldset.addItems( [
				new OO.ui.FieldLayout( preventAccountCreationCheckbox, {
					label: mw.message( 'prevent-account-creation' ).text(),
					align: 'inline'
				} ),
				new OO.ui.FieldLayout( preventEmailSendingCheckbox, {
					label: mw.message( 'prevent-sending-email' ).text(),
					align: 'inline'
				} ),
				new OO.ui.FieldLayout( preventEditOwnTalkPageCheckbox, {
					label: mw.message( 'prevent-editing-own-talk-page' ).text(),
					align: 'inline'
				} )
			] );
			preventAccountCreationCheckbox.on( 'change', ( selected ) => {
				preventAccountCreationValue = selected;
			} );
			preventEmailSendingCheckbox.on( 'change', ( selected ) => {
				preventEmailSendingValue = selected;
			} );
			preventEditOwnTalkPageCheckbox.on( 'change', ( selected ) => {
				preventEditOwnTalkPageValue = selected;
			} );
			fieldset.addItems( [
				new OO.ui.FieldLayout( durationDropdown, {
					label: mw.message( 'block-duration' ).text()
				} ),
				new OO.ui.FieldLayout( reasonDropdown, {
					label: mw.message( 'block-reason' ).text()
				} ),
				new OO.ui.FieldLayout( reasonInput, {
					label: mw.message( 'other-reason' ).text(),
					align: 'inline'
				} ),
				additionalOptionsFieldset
			] );
			this.userBlockPanel.$element.append( fieldset.$element );
			this.userBlockStackLayout = new OO.ui.StackLayout( {
				items: [ this.userBlockPanel ]
			} );
			preventAccountCreationValue = preventAccountCreationCheckbox.isSelected();
			preventEmailSendingValue = preventEmailSendingCheckbox.isSelected();
			preventEditOwnTalkPageValue = preventEditOwnTalkPageCheckbox.isSelected();
			this.$body.append( this.userBlockStackLayout.$element );
		};

		UserBlockDialog.prototype.getSetupProcess = function ( dialogData ) {
			return UserBlockDialog.super.prototype.getSetupProcess
				.call( this, dialogData )
				.next( function () {
					this.actions.setMode( 'edit' );
				}, this );
		};

		UserBlockDialog.prototype.getActionProcess = function ( action ) {
			if ( action === 'about' ) {
				window.open( 'https://meta.wikimedia.org/wiki/Adiutor', '_blank' );
				return UserBlockDialog.super.prototype.getActionProcess.call( this, action );
			}

			if ( action === 'continue' ) {
				return new OO.ui.Process( () => {
					function CheckDurationAndRationaleMessageDialog( config ) {
						CheckDurationAndRationaleMessageDialog.super.call( this, config );
					}

					if ( userToBlock.includes( mwConfig.wgUserName ) ) {
						mw.notify( mw.message( 'you-can-not-block-yourself' ).text(), {
							title: mw.msg( 'operation-completed' ),
							type: 'error'
						} );
						this.close();
						return;
					}

					if ( !duration || !blockReason ) {
						OO.inheritClass(
							CheckDurationAndRationaleMessageDialog,
							OO.ui.MessageDialog
						);
						CheckDurationAndRationaleMessageDialog.static.name = 'CheckDurationAndRationaleMessageDialog';
						CheckDurationAndRationaleMessageDialog.static.actions = [ {
							action: 'okay',
							label: mw.message( 'okay' ).text(),
							flags: 'primary'
						} ];
						CheckDurationAndRationaleMessageDialog.prototype.initialize = function () {
							CheckDurationAndRationaleMessageDialog.super.prototype.initialize
								.apply( this, arguments );
							this.content = new OO.ui.PanelLayout( {
								padded: true
							} );
							this.content.$element.append(
								mw.message( 'please-select-block-duration-reason' ).text()
							);
							this.$body.append( this.content.$element );
						};
						CheckDurationAndRationaleMessageDialog.prototype.getBodyHeight =
							function () {
								return 100;
							};
						CheckDurationAndRationaleMessageDialog.prototype.getActionProcess =
							function ( dialogAction ) {
								if ( dialogAction === 'okay' ) {
									this.close();
								}
								return CheckDurationAndRationaleMessageDialog.super.prototype
									.getActionProcess.call( this, dialogAction );
							};
						const warningWindowManager = new OO.ui.WindowManager();
						$( document.body ).append( warningWindowManager.$element );
						const warningDialog = new CheckDurationAndRationaleMessageDialog();
						warningWindowManager.addWindows( [ warningDialog ] );
						warningWindowManager.openWindow( warningDialog );
						return;
					}

					const allowUserTalkValue = !preventEditOwnTalkPageValue;
					const params = {
						action: 'block',
						user: userToBlock,
						expiry: duration,
						reason: blockReason + additionalReason,
						nocreate: preventAccountCreationValue,
						allowusertalk: allowUserTalkValue,
						noemail: preventEmailSendingValue,
						tags: 'Adiutor'
					};
					api.postWithToken( 'csrf', params ).then( () => {
						mw.notify( mw.msg( 'user-blocked' ), {
							title: mw.msg( 'operation-completed' ),
							type: 'success'
						} );
						if ( sectionId ) {
							return api.postWithToken( 'csrf', {
								action: 'edit',
								title: noticeBoardTitle,
								section: sectionId,
								text: '',
								summary: apiPostSummary,
								tags: 'Adiutor',
								format: 'json'
							} ).then( () => {
								if ( headlineElement ) {
									headlineElement.css( 'text-decoration', 'line-through' );
								}
							} );
						}
						return undefined;
					} ).catch( ( error ) => {
						mw.notify( error, {
							title: mw.msg( 'operation-failed' ),
							type: 'error'
						} );
					} );
					this.close();
				} );
			}
			return UserBlockDialog.super.prototype.getActionProcess.call( this, action );
		};

		UserBlockDialog.prototype.getBodyHeight = function () {
			return this.userBlockPanel.$element.outerHeight( true );
		};

		const ubmWindowManager = new OO.ui.WindowManager();
		$( document.body ).append( ubmWindowManager.$element );
		const blockingDialog = new UserBlockDialog( {
			size: 'medium'
		} );
		ubmWindowManager.addWindows( [ blockingDialog ] );
		ubmWindowManager.openWindow( blockingDialog );

		function getFormattedPageName() {
			return mwConfig.wgPageName
				.replace( /_/g, ' ' )
				.replace( userPagePrefix, '' )
				.replace( specialContributions, '' )
				.replace( userTalkPagePrefix, '' );
		}
	}

	module.exports = {
		callBack: callBack
	};
}() );

/* </nowiki> */
