/* <nowiki> */

/**
 * @file adiutor-bdm.js
 * @description Batch deletion module for processing multiple page deletions via Adiutor.
 * @license CC BY-SA 4.0
 */

( function () {
	'use strict';

	/**
	 * Render and open the batch deletion dialog.
	 *
	 * @return {void}
	 */
	function callBack() {
		/**
		 * A reference to MediaWiki’s core API.
		 *
		 * @type {mw.Api}
		 */
		const api = new mw.Api();

		/**
		 * @typedef {Object} CsdConfiguration
		 * @property {Array<{
		 *   name: string,
		 *   reasons: Array<{ data: string, label: string }>
		 * }>} speedyDeletionReasons
		 * @property {string} csdCategoryForBatchDeletion
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

		const batchDeletionList = [];
		let selectedOptions = [];
		let selectedReason = '';
		let otherRationaleInput;
		const speedyDeletionReasons = csdConfiguration.speedyDeletionReasons;
		const csdCategoryForBatchDeletion = csdConfiguration.csdCategoryForBatchDeletion;
		const apiPostSummaryforTalkPage = csdConfiguration.apiPostSummaryforTalkPage;

		api.get( {
			action: 'query',
			list: 'categorymembers',
			cmtitle: csdCategoryForBatchDeletion,
			cmsort: 'timestamp',
			cmdir: 'desc',
			format: 'json'
		} ).then( ( data ) => {
			const members = data.query.categorymembers;
			members.sort( ( a, b ) => a.title.localeCompare( b.title ) );
			members.forEach( ( page ) => {
				const pageLinkHtml = page.title +
						'<a style="margin-left:10px" target="_blank" href="' +
						page.title + '">→ ' + mw.msg( 'see' ) + '</a>';
				batchDeletionList.push( new OO.ui.CheckboxMultioptionWidget( {
					data: page.title,
					selected: false,
					label: new OO.ui.HtmlSnippet( pageLinkHtml )
				} ) );
			} );

			const multiselectInput = new OO.ui.CheckboxMultiselectWidget( {
				items: batchDeletionList
			} );
			multiselectInput.$element.css( {
				'margin-top': '10px'
			} );

			const selectAllButton = new OO.ui.ButtonWidget( {
				label: mw.msg( 'select-all' ),
				flags: [ 'progressive' ]
			} );
			const clearSelectionButton = new OO.ui.ButtonWidget( {
				label: mw.msg( 'uncheck-selected' )
			} );

			const updateSelectedOptions = () => {
				selectedOptions = batchDeletionList
					.filter( ( option ) => option.isSelected() )
					.map( ( option ) => option.data );
			};

			selectAllButton.on( 'click', () => {
				batchDeletionList.forEach( ( option ) => option.setSelected( true ) );
				updateSelectedOptions();
			} );

			clearSelectionButton.on( 'click', () => {
				batchDeletionList.forEach( ( option ) => option.setSelected( false ) );
				updateSelectedOptions();
			} );

			batchDeletionList.forEach( ( option ) => {
				option.on( 'change', updateSelectedOptions );
			} );

			function BatchDeletionDialog( config ) {
				BatchDeletionDialog.super.call( this, config );
			}

			OO.inheritClass( BatchDeletionDialog, OO.ui.ProcessDialog );
			BatchDeletionDialog.static.name = 'BatchDeletionDialog';
			BatchDeletionDialog.static.title = mw.msg( 'batch-deletion' );
			BatchDeletionDialog.static.actions = [ {
				action: 'save',
				label: OO.ui.deferMsg( 'confirm-action' ),
				flags: [ 'primary', 'destructive' ]
			}, {
				label: OO.ui.deferMsg( 'cancel' ),
				flags: 'safe'
			} ];

			BatchDeletionDialog.prototype.initialize = function () {
				BatchDeletionDialog.super.prototype.initialize.apply( this, arguments );
				const headerTitle = new OO.ui.MessageWidget( {
					type: 'notice',
					inline: true,
					label: mw.msg( 'batch-deletion-warning' )
				} );
				headerTitle.$element.css( {
					'margin-bottom': '20px',
					'font-weight': '300'
				} );

				const dropdownOptions = [];
				speedyDeletionReasons.forEach( ( reasonGroup ) => {
					dropdownOptions.push( {
						optgroup: reasonGroup.name
					} );
					reasonGroup.reasons.forEach( ( reason ) => {
						dropdownOptions.push( {
							data: reason.data,
							label: reason.label
						} );
					} );
				} );

				const reasonDropdown = new OO.ui.DropdownInputWidget( {
					options: dropdownOptions,
					icon: 'dropdown',
					value: null
				} );
				reasonDropdown.on( 'change', ( value ) => {
					selectedReason = value || '';
				} );
				reasonDropdown.$element.css( {
					'margin-top': '20px',
					'margin-bottom': '10px'
				} );

				otherRationaleInput = new OO.ui.TextInputWidget( {
					placeholder: mw.msg( 'other-reason' ),
					value: ''
				} );
				otherRationaleInput.$element.css( {
					'margin-bottom': '20px'
				} );

				const buttonsLayout = new OO.ui.HorizontalLayout( {
					items: [ selectAllButton, clearSelectionButton ]
				} );
				const secondHeader = new OO.ui.FieldsetLayout( {
					label: mw.msg( 'pages-to-be-deleted' ),
					items: [ buttonsLayout ]
				} );
				buttonsLayout.$element.css( {
					display: 'contents'
				} );
				secondHeader.$element.css( {
					'margin-bottom': '10px'
				} );

				this.content = new OO.ui.PanelLayout( {
					padded: true,
					expanded: false
				} );
				this.content.$element.append(
					headerTitle.$element,
					reasonDropdown.$element,
					otherRationaleInput.$element,
					secondHeader.$element,
					multiselectInput.$element
				);
				this.$body.append( this.content.$element );
			};

			BatchDeletionDialog.prototype.getActionProcess = function ( action ) {
				if ( !action ) {
					return BatchDeletionDialog.super.prototype.getActionProcess.call(
						this,
						action
					);
				}

				return new OO.ui.Process( () => {
					let deletionSummary = '';
					const otherReason = otherRationaleInput.getValue();
					if ( selectedReason ) {
						deletionSummary = selectedReason;
						if ( otherReason ) {
							deletionSummary += ' | ';
						}
					}
					if ( otherReason ) {
						deletionSummary += otherReason;
					}

					const talkDeletionSummary = apiPostSummaryforTalkPage;

					const deletePages = selectedOptions.map( ( pageTitle ) => api.postWithToken( 'csrf', {
						action: 'delete',
						title: pageTitle,
						reason: deletionSummary,
						tags: 'Adiutor',
						format: 'json'
					} ).then( () => api.postWithToken( 'csrf', {
						action: 'delete',
						title: 'Tartışma:' + pageTitle,
						reason: talkDeletionSummary,
						tags: 'Adiutor',
						format: 'json'
					} ) ) );

					return Promise.all( deletePages ).then( () => {
						this.close( {
							action: action
						} );
						mw.notify( mw.msg( 'batch-deletion-success' ), {
							title: mw.msg( 'operation-completed' ),
							type: 'success'
						} );
					} );
				} );
			};

			const windowManager = new OO.ui.WindowManager();
			$( document.body ).append( windowManager.$element );

			const dialog = new BatchDeletionDialog();
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
