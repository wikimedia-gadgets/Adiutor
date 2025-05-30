/* <nowiki> */

/**
 * @file Adiutor-CMR.js
 * @description Canned mentor responses module for quickly replying to newcomers via Adiutor.
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
	 * @typedef {Object} CmrConfiguration
	 * @property {Array<{
	 *   label: string,
	 *   options: Array<{
	 *     data: string,
	 *     label: string
	 *   }>
	 * }>} predefinedResponses
	 * @property {string} apiPostSummary
	 */

	/** @type {CmrConfiguration} */
	const cmrConfiguration = require('./Adiutor-CMR.json');

	if (!cmrConfiguration) {
		mw.notify('MediaWiki:Gadget-Adiutor-CMR.json data is empty or undefined.', {
			title: mw.msg('operation-failed'),
			type: 'error'
		});
		return;
	}

	let sectionLink, sectionPath, sectionNumber, mentorResponse;
	const predefinedResponses = cmrConfiguration.predefinedResponses;
	const apiPostSummary = cmrConfiguration.apiPostSummary;
	console.log(predefinedResponses);
	const crButton = new OO.ui.ButtonWidget({
		framed: false,
		label: '[' + mw.msg('cmr-canned-response') + ']',
		classes: ['adiutor-canned-response-button']
	});
	$('.mw-editsection').append(crButton.$element);
	$('.adiutor-canned-response-button').on('click', function () {
		const buttonElement = $(this);
		sectionPath = buttonElement.parent().parent()[0];
		sectionLink = clearURLfromOrigin(sectionPath.querySelector('.mw-editsection a').getAttribute('href'));
		const match = sectionLink.match(/[?&]section=(\d+)/);
		if (match) {
			sectionNumber = match[1];
		} else {
			console.log('Number not found.');
		}
		openCmrDialog();
	});

	function openCmrDialog() {
		/**
		 * The main OOUI dialog for the canned response process.
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
		function CannedResponseDialog(config) {
			CannedResponseDialog.super.call(this, config);
		}

		OO.inheritClass(CannedResponseDialog, OO.ui.ProcessDialog);
		CannedResponseDialog.static.name = 'CannedResponseDialog';
		CannedResponseDialog.static.title = mw.msg('cmr-module-title');
		CannedResponseDialog.static.actions = [{
			action: 'save',
			label: mw.msg('cmr-response'),
			flags: 'primary'
		}, {
			label: mw.msg('cancel'),
			flags: 'safe'
		}];
		CannedResponseDialog.prototype.initialize = function () {
			CannedResponseDialog.super.prototype.initialize.apply(this, arguments);
			const menuItems = [].concat.apply([], predefinedResponses.map((group) => {
				const groupItems = group.options.map((option) => new OO.ui.MenuOptionWidget({
					data: option.data,
					label: option.label
				}));
				return [new OO.ui.MenuSectionOptionWidget({
					label: group.label
				})].concat(groupItems);
			}));
			const dropdown = new OO.ui.DropdownWidget({
				label: mw.msg('cmr-choose-answer'),
				menu: {
					items: menuItems
				}
			});
			const headerMessage = new OO.ui.MessageWidget({
				type: 'notice',
				inline: true,
				label: new OO.ui.HtmlSnippet('<strong>' + mw.msg('cmr-header-title') + '</strong><br><small>' + mw.msg('cmr-header-description') + '</small>')
			});
			headerMessage.$element.css({
				'margin-top': '20px',
				'margin-bottom': '20px'
			});
			this.content = new OO.ui.PanelLayout({
				padded: true,
				expanded: false
			});
			const previewArea = new OO.ui.Element({
				text: '',
				classes: ['adiutor-mentor-response-preview-area']
			});
			previewArea.$element.css('display', 'none');
			this.content.$element.append(headerMessage.$element, dropdown.$element, previewArea.$element);
			this.$body.append(this.content.$element);
			dropdown.getMenu().on('choose', (menuOption) => {
				mentorResponse = menuOption.getData();
				api.get({
					action: 'parse',
					text: mentorResponse,
					disablelimitreport: 1,
					wrapoutputclass: '',
					contentmodel: 'wikitext',
					contentformat: 'text/x-wiki',
					prop: 'text',
					format: 'json'
				}).done((data) => {
					previewArea.$element.css('display', 'block');
					previewArea.$element.html(data.parse.text['*']);
					windowManager.onWindowResize();
				});
			});
		};
		CannedResponseDialog.prototype.getActionProcess = function (action) {
			const dialog = this;
			if (action) {
				return new OO.ui.Process(() => {
					addResponse(sectionNumber);
					dialog.close({
						action: action
					});
				});
			}
			return CannedResponseDialog.super.prototype.getActionProcess.call(this, action);
		};
		CannedResponseDialog.prototype.getBodyHeight = function () {
			return Math.max(this.content.$element.outerHeight(true), 400);
		};
		const windowManager = new OO.ui.WindowManager();
		$(document.body).append(windowManager.$element);
		const dialog = new CannedResponseDialog();
		windowManager.addWindows([dialog]);
		windowManager.openWindow(dialog);

		function addResponse(sectionNumber) {
			api.postWithToken('csrf', {
				action: 'edit',
				title: mw.config.get('wgPageName'),
				section: sectionNumber,
				appendtext: `:${mentorResponse} ~~~~`,
				summary: apiPostSummary,
				tags: 'Adiutor',
				format: 'json'
			}).done(() => {
				location.reload();
			});
		}
	}

	function clearURLfromOrigin(sectionPart) {
		return decodeURIComponent(sectionPart.replace('https//:' + mw.config.get('wgServerName') + '/w/index.php?title=', ''));
	}
}

module.exports = {
	callBack: callBack
};
/* </nowiki> */
