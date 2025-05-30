/* <nowiki> */

/**
 * @file Adiutor-OPT.js
 * @description Options module for managing user preferences and settings in Adiutor.
 * @license CC BY-SA 4.0
 * @see https://meta.wikimedia.org/wiki/Adiutor
 * @author Doğu Abaris <abaris@null.net>
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
	const wikiId = /** @type {string} */ (mw.config.get('wgWikiID'));

	/**
	 * Adiutor user options. These are read from the user’s preferences (global or local).
	 *
	 * @type {Object}
	 */
	const adiutorUserOptions = JSON.parse(
		mw.user.options.get('userjs-adiutor-' + wikiId) || '{}'
	);

	const wikiOptions = 'userjs-adiutor-' + wikiId;
	if (!adiutorUserOptions.hasOwnProperty('myCustomSummaries')) {
		adiutorUserOptions.myCustomSummaries = [];
	}

	/**
	 * The main OOUI dialog for the Adiutor options process.
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
	function AdiutorOptionsDialog(config) {
		AdiutorOptionsDialog.super.call(this, config);
	}

	OO.inheritClass(AdiutorOptionsDialog, OO.ui.ProcessDialog);
	AdiutorOptionsDialog.static.name = 'AdiutorOptionsDialog';
	/**
	 * Title of the dialog.
	 *
	 * @type {string}
	 */
	AdiutorOptionsDialog.static.title = new OO.ui.deferMsg('opt-module-title');
	/**
	 * Dialog actions (Save and Cancel).
	 */
	AdiutorOptionsDialog.static.actions = [{
		action: 'save',
		label: new OO.ui.deferMsg('update'),
		flags: ['primary', 'progressive']
	}, {
		label: new OO.ui.deferMsg('cancel'),
		flags: 'safe'
	}];
	AdiutorOptionsDialog.prototype.initialize = function () {
		AdiutorOptionsDialog.super.prototype.initialize.apply(this, arguments);

		/**
		 * The main panel layout for the dialog content.
		 *
		 * @type {OO.ui.PanelLayout}
		 */
		this.content = new OO.ui.PanelLayout({
			padded: true,
			expanded: false
		});

		/**
		 * Fieldset layout grouping all the options.
		 *
		 * @type {OO.ui.FieldsetLayout}
		 */
		const AdiutorSettings = new OO.ui.FieldsetLayout({
			label: new OO.ui.deferMsg('options')
		});

		// Explicitly declare all settings variables:
		const csdSendMessageToCreator = new OO.ui.FieldLayout(
			new OO.ui.CheckboxInputWidget({
				selected: adiutorUserOptions.speedyDeletion.csdSendMessageToCreator
			}),
			{
				align: 'inline',
				label: new OO.ui.deferMsg('csd-send-message-to-creator'),
				help: new OO.ui.deferMsg('description')
			}
		);

		const afdSendMessageToCreator = new OO.ui.FieldLayout(
			new OO.ui.CheckboxInputWidget({
				selected: adiutorUserOptions.articlesForDeletion.afdSendMessageToCreator
			}),
			{
				align: 'inline',
				label: new OO.ui.deferMsg('afd-send-message-to-creator'),
				help: new OO.ui.deferMsg('description')
			}
		);

		const prdSendMessageToCreator = new OO.ui.FieldLayout(
			new OO.ui.CheckboxInputWidget({
				selected: adiutorUserOptions.proposedDeletion.prdSendMessageToCreator
			}),
			{
				align: 'inline',
				label: new OO.ui.deferMsg('prd-send-message-to-creator'),
				help: new OO.ui.deferMsg('description')
			}
		);

		const csdLogNominatedPages = new OO.ui.FieldLayout(
			new OO.ui.CheckboxInputWidget({
				selected: adiutorUserOptions.speedyDeletion.csdLogNominatedPages
			}),
			{
				align: 'inline',
				label: new OO.ui.deferMsg('csd-log-nominated-pages'),
				help: new OO.ui.deferMsg('description')
			}
		);

		const csdLogPageName = new OO.ui.FieldLayout(
			new OO.ui.TextInputWidget({
				value: adiutorUserOptions.speedyDeletion.csdLogPageName
			}),
			{
				label: new OO.ui.deferMsg('csd-log-page-name'),
				help: new OO.ui.deferMsg('description')
			}
		);

		const afdLogNominatedPages = new OO.ui.FieldLayout(
			new OO.ui.CheckboxInputWidget({
				selected: adiutorUserOptions.articlesForDeletion.afdLogNominatedPages
			}),
			{
				align: 'inline',
				label: new OO.ui.deferMsg('afd-log-nominated-pages'),
				help: new OO.ui.deferMsg('description')
			}
		);

		const afdLogPageName = new OO.ui.FieldLayout(
			new OO.ui.TextInputWidget({
				value: adiutorUserOptions.articlesForDeletion.afdLogPageName
			}),
			{
				label: new OO.ui.deferMsg('afd-log-page-name'),
				help: new OO.ui.deferMsg('description')
			}
		);

		const prdLogNominatedPages = new OO.ui.FieldLayout(
			new OO.ui.CheckboxInputWidget({
				selected: adiutorUserOptions.proposedDeletion.prdLogNominatedPages
			}),
			{
				align: 'inline',
				label: new OO.ui.deferMsg('prd-log-nominated-pages'),
				help: new OO.ui.deferMsg('description')
			}
		);

		const prdLogPageName = new OO.ui.FieldLayout(
			new OO.ui.TextInputWidget({
				value: adiutorUserOptions.proposedDeletion.prdLogPageName
			}),
			{
				label: new OO.ui.deferMsg('prd-log-page-name'),
				help: new OO.ui.deferMsg('description')
			}
		);

		const afdNominateOpinionsLog = new OO.ui.FieldLayout(
			new OO.ui.CheckboxInputWidget({
				selected: adiutorUserOptions.articlesForDeletion.afdNominateOpinionsLog
			}),
			{
				align: 'inline',
				label: new OO.ui.deferMsg('afd-nominate-opinions-log'),
				help: new OO.ui.deferMsg('description')
			}
		);

		const afdOpinionLogPageName = new OO.ui.FieldLayout(
			new OO.ui.TextInputWidget({
				value: adiutorUserOptions.articlesForDeletion.afdOpinionLogPageName
			}),
			{
				label: new OO.ui.deferMsg('afd-opinion-log-page-name'),
				help: new OO.ui.deferMsg('description')
			}
		);

		const showMyStatus = new OO.ui.FieldLayout(
			new OO.ui.CheckboxInputWidget({
				selected: adiutorUserOptions.status.showMyStatus
			}),
			{
				align: 'inline',
				label: new OO.ui.deferMsg('show-my-status'),
				help: new OO.ui.deferMsg('show-status-description')
			}
		);

		const inlinePageInfo = new OO.ui.FieldLayout(
			new OO.ui.CheckboxInputWidget({
				selected: adiutorUserOptions.inlinePageInfo
			}),
			{
				align: 'inline',
				label: new OO.ui.deferMsg('show-inline-page-info'),
				help: new OO.ui.deferMsg('show-inline-page-info-description')
			}
		);

		const showEditSummaries = new OO.ui.FieldLayout(
			new OO.ui.CheckboxInputWidget({
				selected: adiutorUserOptions.showEditSummaries
			}),
			{
				align: 'inline',
				label: new OO.ui.deferMsg('use-pre-defined-edit-summaries'),
				help: new OO.ui.deferMsg('use-pre-defined-edit-summaries-help')
			}
		);

		const myCustomSummaries = new OO.ui.FieldLayout(
			new OO.ui.MultilineTextInputWidget({
				value: adiutorUserOptions.myCustomSummaries.join('\n'),
				rows: 5,
				placeholder: new OO.ui.deferMsg('frequently-used-edit-summaries-placeholder')
			}),
			{
				align: 'inline',
				label: new OO.ui.deferMsg('frequently-used-edit-summaries'),
				help: new OO.ui.deferMsg('frequently-used-edit-summaries-help')
			}
		);

		AdiutorSettings.addItems([
			csdSendMessageToCreator,
			afdSendMessageToCreator,
			prdSendMessageToCreator,
			csdLogNominatedPages,
			csdLogPageName,
			afdLogNominatedPages,
			afdLogPageName,
			prdLogNominatedPages,
			prdLogPageName,
			afdNominateOpinionsLog,
			afdOpinionLogPageName,
			showMyStatus,
			inlinePageInfo,
			showEditSummaries,
			myCustomSummaries
		]);

		this.content.$element.append(AdiutorSettings.$element);
		this.$body.append(this.content.$element);
	};

	/**
	 * Handles the dialog’s action processes.
	 * Saves settings when the Save action is triggered.
	 *
	 * @param {string} action The action being executed.
	 * @return {OO.ui.Process} The process for the given action.
	 */
	AdiutorOptionsDialog.prototype.getActionProcess = function (action) {
		const dialog = this;
		if (action) {
			return new OO.ui.Process(() => {
				UpdatedOptions = {
					myWorks: adiutorUserOptions.myWorks,
					myCustomSummaries: myCustomSummaries.fieldWidget.getValue().split('\n'),
					speedyDeletion: {
						csdSendMessageToCreator: csdSendMessageToCreator.fieldWidget.selected,
						csdLogNominatedPages: csdLogNominatedPages.fieldWidget.selected,
						csdLogPageName: csdLogPageName.fieldWidget.value
					},
					articlesForDeletion: {
						afdSendMessageToCreator: afdSendMessageToCreator.fieldWidget.selected,
						afdLogNominatedPages: afdLogNominatedPages.fieldWidget.selected,
						afdLogPageName: afdLogPageName.fieldWidget.value,
						afdNominateOpinionsLog: afdNominateOpinionsLog.fieldWidget.selected,
						afdOpinionLogPageName: afdOpinionLogPageName.fieldWidget.value
					},
					proposedDeletion: {
						prdSendMessageToCreator: prdSendMessageToCreator.fieldWidget.selected,
						prdLogNominatedPages: prdLogNominatedPages.fieldWidget.selected,
						prdLogPageName: prdLogPageName.fieldWidget.value
					},
					status: {
						showMyStatus: showMyStatus.fieldWidget.selected,
						myStatus: 'active'
					},
					stats: {
						csdRequests: adiutorUserOptions.stats.csdRequests,
						afdRequests: adiutorUserOptions.stats.afdRequests,
						prodRequests: adiutorUserOptions.stats.prodRequests,
						blockRequests: adiutorUserOptions.stats.blockRequests,
						userWarnings: adiutorUserOptions.stats.userWarnings,
						pageTags: adiutorUserOptions.stats.pageTags
					},
					inlinePageInfo: inlinePageInfo.fieldWidget.selected,
					showEditSummaries: showEditSummaries.fieldWidget.selected,
					adiutorVersion: adiutorUserOptions.adiutorVersion
				};
				updateOptions(UpdatedOptions);
				console.log(UpdatedOptions);
				dialog.close({
					action: action
				});
			});
		}
		return AdiutorOptionsDialog.super.prototype.getActionProcess.call(this, action);
	};
	const windowManager = new OO.ui.WindowManager();
	$(document.body).append(windowManager.$element);
	const dialog = new AdiutorOptionsDialog();
	windowManager.addWindows([dialog]);
	windowManager.openWindow(dialog);

	// Define functions below as needed
	function updateOptions(updatedOptions) {
		api.postWithEditToken({
			action: 'globalpreferences',
			format: 'json',
			optionname: wikiOptions,
			optionvalue: JSON.stringify(updatedOptions),
			formatversion: 2
		}).done(() => {
			mw.notify(mw.msg('settings-has-been-updated'), {
				title: mw.msg('operation-completed'),
				type: 'success'
			});
		});
	}
}

module.exports = {
	callBack: callBack
};
/* </nowiki> */
