/* <nowiki> */

/**
 * @file adiutor-opt.js
 * @description Options module for managing user preferences and settings in Adiutor.
 * @license CC BY-SA 4.0
 */

( function () {
	'use strict';

	/**
	 * Open the Adiutor options dialog.
	 *
	 * @return {void}
	 */
	function callBack() {
		/** @type {mw.Api} */
		const api = new mw.Api();

		const wikiId = /** @type {string} */ ( mw.config.get( 'wgWikiID' ) );
		const wikiOptionsKey = 'userjs-adiutor-' + wikiId;
		const adiutorUserOptions = JSON.parse(
			mw.user.options.get( wikiOptionsKey ) || '{}'
		);
		const defaultOptions = {
			myCustomSummaries: [],
			speedyDeletion: {
				csdSendMessageToCreator: true,
				csdLogNominatedPages: true,
				csdLogPageName: 'CSD log'
			},
			articlesForDeletion: {
				afdSendMessageToCreator: true,
				afdLogNominatedPages: true,
				afdLogPageName: 'AFD log',
				afdNominateOpinionsLog: true,
				afdOpinionLogPageName: 'AFD opinion log'
			},
			proposedDeletion: {
				prdSendMessageToCreator: true,
				prdLogNominatedPages: true,
				prdLogPageName: 'PROD log'
			},
			status: {
				showMyStatus: true
			},
			inlinePageInfo: true,
			showEditSummaries: true
		};
		adiutorUserOptions.myCustomSummaries = Array.isArray(
			adiutorUserOptions.myCustomSummaries
		) ? adiutorUserOptions.myCustomSummaries : defaultOptions.myCustomSummaries;
		adiutorUserOptions.speedyDeletion = Object.assign(
			{},
			defaultOptions.speedyDeletion,
			adiutorUserOptions.speedyDeletion
		);
		adiutorUserOptions.articlesForDeletion = Object.assign(
			{},
			defaultOptions.articlesForDeletion,
			adiutorUserOptions.articlesForDeletion
		);
		adiutorUserOptions.proposedDeletion = Object.assign(
			{},
			defaultOptions.proposedDeletion,
			adiutorUserOptions.proposedDeletion
		);
		adiutorUserOptions.status = Object.assign(
			{},
			defaultOptions.status,
			adiutorUserOptions.status
		);
		adiutorUserOptions.inlinePageInfo = adiutorUserOptions.inlinePageInfo !== undefined ?
			adiutorUserOptions.inlinePageInfo :
			defaultOptions.inlinePageInfo;
		adiutorUserOptions.showEditSummaries = adiutorUserOptions.showEditSummaries !== undefined ?
			adiutorUserOptions.showEditSummaries :
			defaultOptions.showEditSummaries;

		if ( !Object.prototype.hasOwnProperty.call( adiutorUserOptions, 'myCustomSummaries' ) ) {
			adiutorUserOptions.myCustomSummaries = [];
		}

		function AdiutorOptionsDialog( config ) {
			AdiutorOptionsDialog.super.call( this, config );
		}

		OO.inheritClass( AdiutorOptionsDialog, OO.ui.ProcessDialog );
		AdiutorOptionsDialog.static.name = 'AdiutorOptionsDialog';
		AdiutorOptionsDialog.static.title = OO.ui.deferMsg( 'opt-module-title' );
		AdiutorOptionsDialog.static.actions = [ {
			action: 'save',
			label: OO.ui.deferMsg( 'update' ),
			flags: [ 'primary', 'progressive' ]
		}, {
			label: OO.ui.deferMsg( 'cancel' ),
			flags: 'safe'
		} ];

		AdiutorOptionsDialog.prototype.initialize = function () {
			AdiutorOptionsDialog.super.prototype.initialize.apply( this, arguments );

			this.content = new OO.ui.PanelLayout( {
				padded: true,
				expanded: false
			} );

			const settingsFieldset = new OO.ui.FieldsetLayout( {
				label: OO.ui.deferMsg( 'options' )
			} );

			const csdSendMessageToCreatorField = new OO.ui.FieldLayout(
				new OO.ui.CheckboxInputWidget( {
					selected: adiutorUserOptions.speedyDeletion.csdSendMessageToCreator
				} ),
				{
					align: 'inline',
					label: OO.ui.deferMsg( 'csd-send-message-to-creator' ),
					help: OO.ui.deferMsg( 'description' )
				}
			);

			const afdSendMessageToCreatorField = new OO.ui.FieldLayout(
				new OO.ui.CheckboxInputWidget( {
					selected: adiutorUserOptions.articlesForDeletion.afdSendMessageToCreator
				} ),
				{
					align: 'inline',
					label: OO.ui.deferMsg( 'afd-send-message-to-creator' ),
					help: OO.ui.deferMsg( 'description' )
				}
			);

			const prdSendMessageToCreatorField = new OO.ui.FieldLayout(
				new OO.ui.CheckboxInputWidget( {
					selected: adiutorUserOptions.proposedDeletion.prdSendMessageToCreator
				} ),
				{
					align: 'inline',
					label: OO.ui.deferMsg( 'prd-send-message-to-creator' ),
					help: OO.ui.deferMsg( 'description' )
				}
			);

			const csdLogNominatedPagesField = new OO.ui.FieldLayout(
				new OO.ui.CheckboxInputWidget( {
					selected: adiutorUserOptions.speedyDeletion.csdLogNominatedPages
				} ),
				{
					align: 'inline',
					label: OO.ui.deferMsg( 'csd-log-nominated-pages' ),
					help: OO.ui.deferMsg( 'description' )
				}
			);

			const csdLogPageNameField = new OO.ui.FieldLayout(
				new OO.ui.TextInputWidget( {
					value: adiutorUserOptions.speedyDeletion.csdLogPageName
				} ),
				{
					label: OO.ui.deferMsg( 'csd-log-page-name' ),
					help: OO.ui.deferMsg( 'description' )
				}
			);

			const afdLogNominatedPagesField = new OO.ui.FieldLayout(
				new OO.ui.CheckboxInputWidget( {
					selected: adiutorUserOptions.articlesForDeletion.afdLogNominatedPages
				} ),
				{
					align: 'inline',
					label: OO.ui.deferMsg( 'afd-log-nominated-pages' ),
					help: OO.ui.deferMsg( 'description' )
				}
			);

			const afdLogPageNameField = new OO.ui.FieldLayout(
				new OO.ui.TextInputWidget( {
					value: adiutorUserOptions.articlesForDeletion.afdLogPageName
				} ),
				{
					label: OO.ui.deferMsg( 'afd-log-page-name' ),
					help: OO.ui.deferMsg( 'description' )
				}
			);

			const prdLogNominatedPagesField = new OO.ui.FieldLayout(
				new OO.ui.CheckboxInputWidget( {
					selected: adiutorUserOptions.proposedDeletion.prdLogNominatedPages
				} ),
				{
					align: 'inline',
					label: OO.ui.deferMsg( 'prd-log-nominated-pages' ),
					help: OO.ui.deferMsg( 'description' )
				}
			);

			const prdLogPageNameField = new OO.ui.FieldLayout(
				new OO.ui.TextInputWidget( {
					value: adiutorUserOptions.proposedDeletion.prdLogPageName
				} ),
				{
					label: OO.ui.deferMsg( 'prd-log-page-name' ),
					help: OO.ui.deferMsg( 'description' )
				}
			);

			const afdNominateOpinionsLogField = new OO.ui.FieldLayout(
				new OO.ui.CheckboxInputWidget( {
					selected: adiutorUserOptions.articlesForDeletion.afdNominateOpinionsLog
				} ),
				{
					align: 'inline',
					label: OO.ui.deferMsg( 'afd-nominate-opinions-log' ),
					help: OO.ui.deferMsg( 'description' )
				}
			);

			const afdOpinionLogPageNameField = new OO.ui.FieldLayout(
				new OO.ui.TextInputWidget( {
					value: adiutorUserOptions.articlesForDeletion.afdOpinionLogPageName
				} ),
				{
					label: OO.ui.deferMsg( 'afd-opinion-log-page-name' ),
					help: OO.ui.deferMsg( 'description' )
				}
			);

			const showMyStatusField = new OO.ui.FieldLayout(
				new OO.ui.CheckboxInputWidget( {
					selected: adiutorUserOptions.status.showMyStatus
				} ),
				{
					align: 'inline',
					label: OO.ui.deferMsg( 'status-show-my-status' ),
					help: OO.ui.deferMsg( 'description' )
				}
			);

			const inlinePageInfoField = new OO.ui.FieldLayout(
				new OO.ui.CheckboxInputWidget( {
					selected: adiutorUserOptions.inlinePageInfo
				} ),
				{
					align: 'inline',
					label: OO.ui.deferMsg( 'inline-page-info' ),
					help: OO.ui.deferMsg( 'description' )
				}
			);

			const showEditSummariesField = new OO.ui.FieldLayout(
				new OO.ui.CheckboxInputWidget( {
					selected: adiutorUserOptions.showEditSummaries
				} ),
				{
					align: 'inline',
					label: OO.ui.deferMsg( 'show-edit-summaries' ),
					help: OO.ui.deferMsg( 'description' )
				}
			);

			settingsFieldset.addItems( [
				csdSendMessageToCreatorField,
				csdLogNominatedPagesField,
				csdLogPageNameField,
				afdSendMessageToCreatorField,
				afdLogNominatedPagesField,
				afdLogPageNameField,
				afdNominateOpinionsLogField,
				afdOpinionLogPageNameField,
				prdSendMessageToCreatorField,
				prdLogNominatedPagesField,
				prdLogPageNameField,
				showMyStatusField,
				inlinePageInfoField,
				showEditSummariesField
			] );

			this.content.$element.append( settingsFieldset.$element );
			this.$body.append( this.content.$element );
		};

		AdiutorOptionsDialog.prototype.getActionProcess = function ( action ) {
			if ( !action ) {
				return AdiutorOptionsDialog.super.prototype.getActionProcess.call( this, action );
			}

			return new OO.ui.Process( () => {
				const $checkboxes = this.content.$element.find( 'input[type=checkbox]' );
				const $textInputs = this.content.$element.find( 'input[type=text]' );
				const updatedOptions = {
					speedyDeletion: {
						csdSendMessageToCreator: $checkboxes.eq( 0 ).prop( 'checked' ),
						csdLogNominatedPages: $checkboxes.eq( 1 ).prop( 'checked' ),
						csdLogPageName: $textInputs.eq( 0 ).val()
					},
					articlesForDeletion: {
						afdSendMessageToCreator: $checkboxes.eq( 2 ).prop( 'checked' ),
						afdLogNominatedPages: $checkboxes.eq( 3 ).prop( 'checked' ),
						afdLogPageName: $textInputs.eq( 1 ).val(),
						afdNominateOpinionsLog: $checkboxes.eq( 4 ).prop( 'checked' ),
						afdOpinionLogPageName: $textInputs.eq( 2 ).val()
					},
					proposedDeletion: {
						prdSendMessageToCreator: $checkboxes.eq( 5 ).prop( 'checked' ),
						prdLogNominatedPages: $checkboxes.eq( 6 ).prop( 'checked' ),
						prdLogPageName: $textInputs.eq( 3 ).val()
					},
					status: {
						showMyStatus: $checkboxes.eq( 7 ).prop( 'checked' )
					},
					inlinePageInfo: $checkboxes.eq( 8 ).prop( 'checked' ),
					showEditSummaries: $checkboxes.eq( 9 ).prop( 'checked' )
				};

				return api.postWithToken( 'csrf', {
					action: 'options',
					format: 'json',
					optionname: wikiOptionsKey,
					optionvalue: JSON.stringify( updatedOptions )
				} ).then( () => {
					mw.notify( mw.msg( 'preferences-saved' ), {
						title: mw.msg( 'operation-completed' ),
						type: 'success'
					} );
					this.close( {
						action: action
					} );
				} );
			} );
		};

		const windowManager = new OO.ui.WindowManager();
		$( document.body ).append( windowManager.$element );
		const dialog = new AdiutorOptionsDialog();
		windowManager.addWindows( [ dialog ] );
		windowManager.openWindow( dialog );
	}

	module.exports = {
		callBack: callBack
	};
}() );

/* </nowiki> */
