/* <nowiki> */

/**
 * @file adiutor-prd.js
 * @description Proposed deletion module for nominating pages for PROD via Adiutor.
 * @license CC BY-SA 4.0
 */

( function () {
	'use strict';

	/**
	 * Open proposed deletion dialog.
	 *
	 * @return {void}
	 */
	function callBack() {
		/** @type {mw.Api} */
		const api = new mw.Api();

		/**
		 * @typedef {Object} PrdConfiguration
		 * @property {string} noticeBoardTitle
		 * @property {boolean} addNewSection
		 * @property {boolean} appendText
		 * @property {boolean} prependText
		 * @property {string|undefined} sectionId
		 * @property {string} contentPattern
		 * @property {string} apiPostSummary
		 * @property {string} sectionTitle
		 */

		/** @type {PrdConfiguration} */
		const prdConfiguration = require( './adiutor-prd.json' );

		if ( !prdConfiguration ) {
			mw.notify( 'MediaWiki:Gadget-adiutor-prd.json data is empty or undefined.', {
				title: mw.msg( 'operation-failed' ),
				type: 'error'
			} );
			return;
		}

		const noticeBoardTitle = prdConfiguration.noticeBoardTitle;
		const contentPattern = prdConfiguration.contentPattern;

		if ( !noticeBoardTitle || !contentPattern ) {
			mw.notify( 'MediaWiki:Gadget-adiutor-prd.json is missing required keys.', {
				title: mw.msg( 'operation-failed' ),
				type: 'error'
			} );
			return;
		}

		const noticeBoardLink = noticeBoardTitle.replace( / /g, '_' );
		const addNewSection = prdConfiguration.addNewSection;
		const appendText = prdConfiguration.appendText;
		const prependText = prdConfiguration.prependText;
		const sectionId = prdConfiguration.sectionId;
		const apiPostSummary = prdConfiguration.apiPostSummary;
		const sectionTitle = prdConfiguration.sectionTitle;
		const pageTitle = mw.config.get( 'wgPageName' ).replace( /_/g, ' ' );

		function ProposedDeletionDialog( config ) {
			ProposedDeletionDialog.super.call( this, config );
		}

		OO.inheritClass( ProposedDeletionDialog, OO.ui.ProcessDialog );
		ProposedDeletionDialog.static.name = 'ProposedDeletionDialog';
		ProposedDeletionDialog.static.title = OO.ui.deferMsg( 'prd-module-title' );
		ProposedDeletionDialog.static.actions = [ {
			action: 'save',
			label: OO.ui.deferMsg( 'create' ),
			flags: [ 'primary', 'progressive' ]
		}, {
			label: OO.ui.deferMsg( 'cancel' ),
			flags: 'safe'
		} ];

		ProposedDeletionDialog.prototype.initialize = function () {
			ProposedDeletionDialog.super.prototype.initialize.apply( this, arguments );
			const headerTitle = new OO.ui.MessageWidget( {
				type: 'notice',
				inline: true,
				label: OO.ui.deferMsg( 'prd-header-title' )
			} );
			const headerTitleDescription = new OO.ui.LabelWidget( {
				label: OO.ui.deferMsg( 'prd-header-description' )
			} );
			headerTitleDescription.$element.css( {
				'margin-top': '20px',
				'margin-bottom': '20px'
			} );

			this.rationaleInput = new OO.ui.MultilineTextInputWidget( {
				placeholder: OO.ui.deferMsg( 'prd-rationale-placeholder' ),
				value: '',
				indicator: 'required'
			} );

			const requestRationale = new OO.ui.FieldsetLayout( {} );
			requestRationale.addItems( [
				new OO.ui.FieldLayout( this.rationaleInput, {
					label: OO.ui.deferMsg( 'rationale' ),
					align: 'inline'
				} )
			] );
			requestRationale.$element.css( 'font-weight', '900' );
			this.content = new OO.ui.PanelLayout( {
				padded: true,
				expanded: false
			} );
			this.content.$element.append(
				headerTitle.$element,
				headerTitleDescription.$element,
				requestRationale.$element,
				this.rationaleInput.$element
			);
			this.$body.append( this.content.$element );
		};

		ProposedDeletionDialog.prototype.getActionProcess = function ( action ) {
			if ( !action ) {
				return ProposedDeletionDialog.super.prototype.getActionProcess.call( this, action );
			}

			return new OO.ui.Process( () => {
				const placeholders = {
					$1: pageTitle,
					$2: this.rationaleInput.getValue()
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
		const dialog = new ProposedDeletionDialog();
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
