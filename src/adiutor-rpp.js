/* <nowiki> */

/**
 * @file adiutor-rpp.js
 * @description Page protection request module for reporting pages needing protection via Adiutor.
 * @license CC BY-SA 4.0
 */

( function () {
	'use strict';

	/**
	 * Open the page protection request dialog.
	 *
	 * @return {void}
	 */
	function callBack() {
		/** @type {mw.Api} */
		const api = new mw.Api();

		/**
		 * @typedef {Object} RppConfiguration
		 * @property {string} noticeBoardTitle
		 * @property {Array<{label: string, data: string}>} protectionDurations
		 * @property {Array<{label: string, data: string}>} protectionTypes
		 * @property {boolean} addNewSection
		 * @property {boolean} appendText
		 * @property {boolean} prependText
		 * @property {string|undefined} sectionId
		 * @property {string} contentPattern
		 * @property {string} apiPostSummary
		 * @property {string} sectionTitle
		 */

		/** @type {RppConfiguration} */
		const rppConfiguration = require( './adiutor-rpp.json' );

		if ( !rppConfiguration ) {
			mw.notify( 'MediaWiki:Gadget-adiutor-rpp.json data is empty or undefined.', {
				title: mw.msg( 'operation-failed' ),
				type: 'error'
			} );
			return;
		}

		const noticeBoardTitle = rppConfiguration.noticeBoardTitle;
		const noticeBoardLink = noticeBoardTitle.replace( / /g, '_' );
		const protectionDurations = rppConfiguration.protectionDurations;
		const protectionTypes = rppConfiguration.protectionTypes;
		const addNewSection = rppConfiguration.addNewSection;
		const appendText = rppConfiguration.appendText;
		const prependText = rppConfiguration.prependText;
		const sectionId = rppConfiguration.sectionId;
		const contentPattern = rppConfiguration.contentPattern;
		const apiPostSummary = rppConfiguration.apiPostSummary;
		const sectionTitle = rppConfiguration.sectionTitle;
		const pageTitle = mw.config.get( 'wgPageName' ).replace( /_/g, ' ' );

		let selectedProtectionType = '';
		let selectedProtectionDuration = '';
		let rationaleInput;

		function PageProtectionDialog( config ) {
			PageProtectionDialog.super.call( this, config );
		}

		OO.inheritClass( PageProtectionDialog, OO.ui.ProcessDialog );
		PageProtectionDialog.static.name = 'PageProtectionDialog';
		PageProtectionDialog.static.title = OO.ui.deferMsg( 'rpp-module-title' );
		PageProtectionDialog.static.actions = [ {
			action: 'save',
			label: OO.ui.deferMsg( 'create-request' ),
			flags: [ 'primary', 'progressive' ]
		}, {
			label: OO.ui.deferMsg( 'cancel' ),
			flags: 'safe'
		} ];

		PageProtectionDialog.prototype.initialize = function () {
			PageProtectionDialog.super.prototype.initialize.apply( this, arguments );
			const headerTitle = new OO.ui.MessageWidget( {
				type: 'notice',
				inline: true,
				label: OO.ui.deferMsg( 'rpp-header-title' )
			} );
			const headerTitleDescription = new OO.ui.LabelWidget( {
				label: OO.ui.deferMsg( 'rpp-header-description' )
			} );
			headerTitleDescription.$element.css( {
				'margin-top': '10px',
				'margin-left': '30px',
				'margin-bottom': '20px'
			} );

			const protectionTypeDropdown = new OO.ui.DropdownWidget( {
				menu: {
					items: protectionTypes.map( ( type ) => new OO.ui.MenuOptionWidget( {
						data: type.data,
						label: type.label
					} ) )
				},
				label: OO.ui.deferMsg( 'select-protection-type' ),
				classes: [ 'adiutor-rpp-button-select' ]
			} );

			const protectionDurationDropdown = new OO.ui.DropdownWidget( {
				menu: {
					items: protectionDurations.map( ( duration ) => new OO.ui.MenuOptionWidget( {
						data: duration.data,
						label: duration.label
					} ) )
				},
				label: mw.message( 'choose-duration' ).text()
			} );

			rationaleInput = new OO.ui.MultilineTextInputWidget( {
				placeholder: OO.ui.deferMsg( 'rpp-rationale-placeholder' ),
				indicator: 'required',
				value: ''
			} );

			protectionTypeDropdown.getMenu().on( 'choose', ( menuOption ) => {
				selectedProtectionType = menuOption.getData();
			} );

			protectionDurationDropdown.getMenu().on( 'choose', ( duration ) => {
				selectedProtectionDuration = duration.getData();
			} );

			const fieldset = new OO.ui.FieldsetLayout( {
				label: OO.ui.deferMsg( 'protection-type' )
			} );
			fieldset.addItems( [
				protectionDurationDropdown,
				protectionTypeDropdown,
				new OO.ui.FieldLayout( rationaleInput, {
					label: OO.ui.deferMsg( 'rationale' ),
					align: 'inline'
				} )
			] );

			this.content = new OO.ui.PanelLayout( {
				padded: true,
				expanded: false
			} );
			this.content.$element.append(
				headerTitle.$element,
				headerTitleDescription.$element,
				fieldset.$element
			);
			this.$body.append( this.content.$element );
		};

		PageProtectionDialog.prototype.getActionProcess = function ( action ) {
			if ( !action ) {
				return PageProtectionDialog.super.prototype.getActionProcess.call( this, action );
			}

			return new OO.ui.Process( () => {
				const placeholders = {
					$1: pageTitle,
					$2: selectedProtectionDuration,
					$3: selectedProtectionType,
					$4: rationaleInput.getValue()
				};
				const preparedContent = replacePlaceholders( contentPattern, placeholders );
				let apiParams;

				if ( addNewSection ) {
					apiParams = {
						action: 'edit',
						title: noticeBoardTitle,
						section: 'new',
						sectiontitle: replaceParameter( sectionTitle, '1', pageTitle ),
						text: preparedContent,
						summary: replaceParameter( apiPostSummary, '1', pageTitle ),
						tags: 'Adiutor',
						format: 'json'
					};
				} else if ( sectionId ) {
					apiParams = {
						action: 'edit',
						title: noticeBoardTitle,
						section: sectionId,
						summary: replaceParameter( apiPostSummary, '1', pageTitle ),
						tags: 'Adiutor',
						format: 'json'
					};
					if ( appendText ) {
						apiParams.appendtext = preparedContent + '\n';
					} else if ( prependText ) {
						apiParams.prependtext = preparedContent + '\n';
					}
				} else {
					apiParams = {
						action: 'edit',
						title: noticeBoardTitle,
						summary: replaceParameter( apiPostSummary, '1', pageTitle ),
						tags: 'Adiutor',
						format: 'json'
					};
					if ( appendText ) {
						apiParams.appendtext = preparedContent + '\n';
					} else if ( prependText ) {
						apiParams.prependtext = preparedContent + '\n';
					}
				}

				return api.postWithToken( 'csrf', apiParams ).then( () => {
					window.location = '/wiki/' + noticeBoardLink;
					this.close( {
						action: action
					} );
				} );
			} );
		};

		const windowManager = new OO.ui.WindowManager();
		$( document.body ).append( windowManager.$element );
		const dialog = new PageProtectionDialog();
		windowManager.addWindows( [ dialog ] );
		windowManager.openWindow( dialog );

		function replacePlaceholders( input, replacements ) {
			return input.replace( /\$(\d+)/g, ( match, group ) => {
				const replacement = replacements[ '$' + group ];
				return replacement !== undefined ? replacement : match;
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
