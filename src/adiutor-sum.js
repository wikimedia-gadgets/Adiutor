/* <nowiki> */
/* global ve */

/**
 * @file adiutor-sum.js
 * @description Edit summary module providing predefined common summaries for quick
 * editing.
 * @license CC BY-SA 4.0
 */

( function () {
	'use strict';

	/**
	 * Attach common summaries to the edit UI.
	 *
	 * @return {void}
	 */
	function callBack() {
		const $body = $( document.body );
		const wikiId = /** @type {string} */ ( mw.config.get( 'wgWikiID' ) );
		const adiutorUserOptions = JSON.parse(
			mw.user.options.get( 'userjs-adiutor-' + wikiId ) || '{}'
		);

		/**
		 * @typedef {Object} SumConfiguration
		 * @property {{ article: string[], nonArticle: string[], general: string[],
		 * talkPage: string[] }} summaryCategories
		 */

		/** @type {SumConfiguration} */
		const sumConfiguration = require( './adiutor-sum.json' );

		if ( !sumConfiguration ) {
			mw.notify( 'MediaWiki:Gadget-adiutor-sum.json data is empty or undefined.', {
				title: mw.msg( 'operation-failed' ),
				type: 'error'
			} );
			return;
		}

		const summaryCategories = sumConfiguration.summaryCategories;
		summaryCategories.general = summaryCategories.general.concat(
			adiutorUserOptions.myCustomSummaries || []
		);
		let $summaryTextarea = null;

		function addOptionsToDropdown( dropdown, optionTexts ) {
			optionTexts.forEach( ( optionText ) => {
				dropdown.menu.addItems( [ new OO.ui.MenuOptionWidget( {
					label: optionText
				} ) ] );
			} );
		}

		function onSummarySelect( option ) {
			if ( !$summaryTextarea ) {
				return;
			}
			const originalSummary = $summaryTextarea.val();
			const cannedSummary = option.getLabel();
			let newSummary = originalSummary;

			if ( newSummary.length !== 0 && newSummary.charAt( newSummary.length - 1 ) !== ' ' ) {
				newSummary += ' ';
			}

			newSummary += cannedSummary;
			$summaryTextarea.val( newSummary ).trigger( 'change' );
		}

		function insertSummaryOptions( $insertBeforeElement ) {
			const namespace = mw.config.get( 'wgNamespaceNumber' );
			const $optionsContainer = $( '<div>' ).css( 'display', 'flex' );

			const namespaceDropdown = new OO.ui.DropdownWidget( {
				label: mw.msg( 'namespace-edit-summaries' )
			} );
			namespaceDropdown.menu.on( 'select', onSummarySelect );
			addOptionsToDropdown(
				namespaceDropdown,
				namespace === 0 ? summaryCategories.article : summaryCategories.nonArticle
			);
			$optionsContainer.append( namespaceDropdown.$element );

			const generalDropdown = new OO.ui.DropdownWidget( {
				label: mw.msg( 'common-edit-summaries' )
			} );
			generalDropdown.menu.on( 'select', onSummarySelect );
			addOptionsToDropdown( generalDropdown, summaryCategories.general );
			$optionsContainer.append( generalDropdown.$element );

			if ( namespace !== 0 && ( namespace % 2 !== 0 && namespace !== 3 ) ) {
				const talkDropdown = new OO.ui.DropdownWidget( {
					label: mw.msg( 'ccommon-discussion-edit-summaries' )
				} );
				talkDropdown.menu.on( 'select', onSummarySelect );
				addOptionsToDropdown( talkDropdown, summaryCategories.talkPage );
				$optionsContainer.append( talkDropdown.$element );
			}

			$optionsContainer.css( 'margin-bottom', '10px' );
			$insertBeforeElement.before( $optionsContainer );
		}

		mw.hook( 've.saveDialog.stateChanged' ).add( () => {
			if ( $body.data( 'wppresent' ) ) {
				return;
			}
			$body.data( 'wppresent', 'true' );
			const target = ve.init.target;
			const $saveOptions = target.saveDialog.$saveOptions;
			$summaryTextarea = target.saveDialog.editSummaryInput.$input;
			if ( !$saveOptions.length ) {
				return;
			}
			insertSummaryOptions( $saveOptions );
		} );

		$.when( mw.loader.using( 'oojs-ui-core' ), $.ready ).then( () => {
			const $editCheckboxes = $body.find( '.editCheckboxes' );
			if ( !$editCheckboxes.length ) {
				return;
			}
			$summaryTextarea = $body.find( '#wpSummary' );
			insertSummaryOptions( $editCheckboxes );
		} );
	}

	module.exports = {
		callBack: callBack
	};
}() );

/* </nowiki> */
