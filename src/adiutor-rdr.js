/* <nowiki> */

/**
 * @file adiutor-rdr.js
 * @description Revision deletion request module for tagging revisions for deletion via Adiutor.
 * @license CC BY-SA 4.0
 */

( function () {
	'use strict';

	/**
	 * Open revision deletion request dialog.
	 *
	 * @return {void}
	 */
	function callBack() {
		/** @type {mw.Api} */
		const api = new mw.Api();

		/**
		 * @typedef {Object} RdrConfiguration
		 * @property {string} noticeBoardTitle
		 * @property {string} apiPostSummary
		 * @property {string} contentPattern
		 * @property {boolean} appendText
		 * @property {boolean} prependText
		 */

		/** @type {RdrConfiguration} */
		const rdrConfiguration = require( './adiutor-rdr.json' );

		if ( !rdrConfiguration ) {
			mw.notify( 'MediaWiki:Gadget-adiutor-rdr.json data is empty or undefined.', {
				title: mw.msg( 'operation-failed' ),
				type: 'error'
			} );
			return;
		}

		const noticeBoardTitle = rdrConfiguration.noticeBoardTitle;
		const noticeBoardLink = noticeBoardTitle.replace( / /g, '_' );
		const apiPostSummary = rdrConfiguration.apiPostSummary;
		const contentPattern = rdrConfiguration.contentPattern;
		const appendText = rdrConfiguration.appendText;
		const prependText = rdrConfiguration.prependText;
		const pageTitle = mw.config.get( 'wgPageName' ).replace( /_/g, ' ' );

		function RevisionDeletionRequestDialog( config ) {
			RevisionDeletionRequestDialog.super.call( this, config );
		}

		OO.inheritClass( RevisionDeletionRequestDialog, OO.ui.ProcessDialog );
		RevisionDeletionRequestDialog.static.name = 'RevisionDeletionRequestDialog';
		RevisionDeletionRequestDialog.static.title = OO.ui.deferMsg( 'rdr-module-title' );
		RevisionDeletionRequestDialog.static.actions = [ {
			action: 'save',
			label: OO.ui.deferMsg( 'create-request' ),
			flags: [ 'primary', 'progressive' ]
		}, {
			label: OO.ui.deferMsg( 'cancel' ),
			flags: 'safe'
		} ];

		RevisionDeletionRequestDialog.prototype.initialize = function () {
			RevisionDeletionRequestDialog.super.prototype.initialize.apply( this, arguments );
			const headerTitle = new OO.ui.MessageWidget( {
				type: 'notice',
				inline: true,
				label: OO.ui.deferMsg( 'rdr-header-title' )
			} );
			const headerTitleDescription = new OO.ui.LabelWidget( {
				label: OO.ui.deferMsg( 'rdr-header-description' )
			} );
			headerTitleDescription.$element.css( {
				'margin-top': '20px',
				'margin-bottom': '20px'
			} );

			this.revisionNumberInput = new OO.ui.TextInputWidget( {
				value: '',
				indicator: 'required'
			} );
			this.deletionRationaleInput = new OO.ui.MultilineTextInputWidget( {
				placeholder: OO.ui.deferMsg( 'rdr-rationale-placeholder' ),
				value: '',
				indicator: 'required'
			} );
			this.commentInput = new OO.ui.MultilineTextInputWidget( {
				placeholder: OO.ui.deferMsg( 'rdr-comment-placeholder' ),
				value: '',
				indicator: 'required'
			} );

			const requestFieldset = new OO.ui.FieldsetLayout( {} );
			requestFieldset.addItems( [
				new OO.ui.FieldLayout( this.revisionNumberInput, {
					label: OO.ui.deferMsg( 'rdr-revision-id' ),
					align: 'inline'
				} ),
				new OO.ui.FieldLayout( this.deletionRationaleInput, {
					label: OO.ui.deferMsg( 'rdr-rationale' ),
					align: 'inline'
				} ),
				new OO.ui.FieldLayout( this.commentInput, {
					label: OO.ui.deferMsg( 'rdr-comment' ),
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
				requestFieldset.$element
			);
			this.$body.append( this.content.$element );
		};

		RevisionDeletionRequestDialog.prototype.getActionProcess = function ( action ) {
			if ( !action ) {
				return RevisionDeletionRequestDialog.super.prototype.getActionProcess.call(
					this,
					action
				);
			}

			return new OO.ui.Process( () => {
				const placeholders = {
					$1: pageTitle,
					$2: this.revisionNumberInput.getValue(),
					$3: this.deletionRationaleInput.getValue(),
					$4: this.commentInput.getValue()
				};

				const preparedContent = replacePlaceholders( contentPattern, placeholders );
				const apiParams = {
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
				} else {
					apiParams.text = preparedContent + '\n';
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
		const dialog = new RevisionDeletionRequestDialog();
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
