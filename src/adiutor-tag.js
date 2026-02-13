/* <nowiki> */

/**
 * @file adiutor-tag.js
 * @description Page tagging module for adding maintenance and cleanup tags via Adiutor.
 * @license CC BY-SA 4.0
 */

( function () {
	'use strict';

	/**
	 * Open page tagging dialog.
	 *
	 * @return {void}
	 */
	function callBack() {
		/** @type {mw.Api} */
		const api = new mw.Api();
		const wikiId = /** @type {string} */ ( mw.config.get( 'wgWikiID' ) );
		const adiutorUserOptions = JSON.parse(
			mw.user.options.get( 'userjs-adiutor-' + wikiId ) || '{}'
		);

		/**
		 * @typedef {Object} SubItemItem
		 * @property {'input'|'checkbox'} type
		 * @property {string} label
		 * @property {string} name
		 * @property {string} [value]
		 * @property {boolean} [required]
		 * @property {string} [parameter]
		 */

		/**
		 * @typedef {Object} TagItem
		 * @property {'input'|'checkbox'} type
		 * @property {string} label
		 * @property {string} name
		 * @property {string} [value]
		 * @property {boolean} [required]
		 * @property {string} [parameter]
		 * @property {SubItemItem[]} [items]
		 */

		/**
		 * @typedef {Object} Tag
		 * @property {string} tag
		 * @property {string} name
		 * @property {string} description
		 * @property {TagItem[]} [items]
		 */

		/**
		 * @typedef {Object} TagGroup
		 * @property {string} label
		 * @property {Tag[]} tags
		 */

		/**
		 * @typedef {Object} TagConfiguration
		 * @property {TagGroup[]} tagList
		 * @property {boolean} useMultipleIssuesTemplate
		 * @property {string} multipleIssuesTemplate
		 * @property {string} uncategorizedTemplate
		 * @property {string} apiPostSummary
		 */

		/** @type {TagConfiguration} */
		const tagConfiguration = require( './adiutor-tag.json' );

		if ( !tagConfiguration ) {
			mw.notify( 'MediaWiki:Gadget-adiutor-tag.json data is empty or undefined.', {
				title: mw.msg( 'operation-failed' ),
				type: 'error'
			} );
			return;
		}

		const tagOptions = [];
		/** @type {Tag[]} */
		let selectedTags = [];
		const preparedTemplates = [];
		let preparedTagsString = '';
		/** @type {TagGroup[]} */
		const tagList = tagConfiguration.tagList;
		const useMultipleIssuesTemplate = tagConfiguration.useMultipleIssuesTemplate;
		const multipleIssuesTemplate = tagConfiguration.multipleIssuesTemplate;
		const uncategorizedTemplate = tagConfiguration.uncategorizedTemplate;
		const apiPostSummary = tagConfiguration.apiPostSummary;

		function PageTaggingDialog( config ) {
			PageTaggingDialog.super.call( this, config );
		}

		OO.inheritClass( PageTaggingDialog, OO.ui.ProcessDialog );
		PageTaggingDialog.static.name = 'PageTaggingDialog';
		PageTaggingDialog.static.title = OO.ui.deferMsg( 'tag-module-title' );
		PageTaggingDialog.static.actions = [ {
			action: 'save',
			label: OO.ui.deferMsg( 'add-tag' ),
			flags: [ 'primary', 'progressive' ]
		}, {
			label: OO.ui.deferMsg( 'cancel' ),
			flags: 'safe'
		} ];

		PageTaggingDialog.prototype.initialize = function () {
			PageTaggingDialog.super.prototype.initialize.apply( this, arguments );
			const headerTitle = new OO.ui.MessageWidget( {
				type: 'notice',
				inline: true,
				label: OO.ui.deferMsg( 'tag-header-description' )
			} );
			const searchInput = new OO.ui.TextInputWidget( {
				placeholder: mw.msg( 'search-tag' )
			} );
			searchInput.$element.css( {
				'margin-top': '10px',
				'margin-bottom': '15px'
			} );
			this.content = new OO.ui.PanelLayout( {
				padded: true,
				expanded: false
			} );
			this.content.$element.append( headerTitle.$element, searchInput.$element );

			tagList.forEach( function ( tagGroup ) {
				const labelElement = new OO.ui.LabelWidget( {
					label: tagGroup.label
				} );
				labelElement.$element.css( {
					'margin-top': '10px',
					'margin-bottom': '15px',
					'font-weight': '900'
				} );
				this.content.$element.append( labelElement.$element );
				tagGroup.tags.forEach( function ( tag ) {
					const tagOption = new OO.ui.CheckboxMultioptionWidget( {
						data: tag.tag,
						name: tag.name,
						label: tag.description,
						align: 'inline'
					} );
					tagOption.on( 'change', ( selected ) => {
						updateSelectedTags( selected, tag );
					} );
					if ( tag.items ) {
						const subItemsLayout = new OO.ui.HorizontalLayout();
						subItemsLayout.$element.css( 'display', 'none' );
						tag.items.forEach( ( subItem ) => {
							if ( subItem.type === 'input' ) {
								const subItemInput = new OO.ui.TextInputWidget( {
									label: subItem.label,
									name: subItem.name,
									required: subItem.required || false
								} );
								subItem.widget = subItemInput;
								subItemsLayout.addItems( [ subItemInput ] );
							}
							if ( subItem.type === 'checkbox' ) {
								const subItemCheckbox = new OO.ui.CheckboxMultioptionWidget( {
									data: subItem.value,
									name: subItem.name,
									label: subItem.label
								} );
								subItem.widget = subItemCheckbox;
								subItemCheckbox.on( 'change', ( selected ) => {
									updateSelectedTags( selected, tag );
								} );
								subItemsLayout.addItems( [ subItemCheckbox ] );
							}
							if ( subItem.items ) {
								subItem.items.forEach( ( subItemItem ) => {
									if ( subItemItem.type === 'input' ) {
										const subItemItemInput = new OO.ui.TextInputWidget( {
											label: subItemItem.label,
											name: subItemItem.name,
											required: subItemItem.required || false,
											align: 'inline'
										} );
										subItemItem.widget = subItemItemInput;
										subItemsLayout.addItems( [ subItemItemInput ] );
									}
									if ( subItemItem.type === 'checkbox' ) {
										const subItemItemCheckbox =
											new OO.ui.CheckboxMultioptionWidget( {
												data: subItemItem.value,
												name: subItemItem.name,
												label: subItemItem.label,
												align: 'inline'
											} );
										subItemItem.widget = subItemItemCheckbox;
										subItemItemCheckbox.on( 'change', ( selected ) => {
											updateSelectedTags( selected, tag );
										} );
										subItemItemCheckbox.$element.css( 'margin-left', '30px' );
										subItemsLayout.addItems( [ subItemItemCheckbox ] );
									}
								} );
							}
						} );
						tagOption.on( 'change', ( selected ) => {
							if ( selected ) {
								subItemsLayout.$element.show();
							} else {
								subItemsLayout.$element.hide();
							}
						} );
						tagOption.$element.append( subItemsLayout.$element );
						subItemsLayout.$element.css( 'margin-top', '10px' );
					}
					tagOptions.push( tagOption );
					this.content.$element.append( tagOption.$element );
					tagOption.$element.css( 'display', 'block' );
				}, this );
			}, this );

			searchInput.on( 'input', () => {
				const searchText = searchInput.getValue().toLowerCase();
				tagOptions.forEach( ( tagOption ) => {
					const label = tagOption.label.toLowerCase();
					const data = tagOption.data ? tagOption.data.toLowerCase() : '';
					if ( label.includes( searchText ) || data.includes( searchText ) ) {
						tagOption.$element.show();
					} else {
						tagOption.$element.hide();
					}
				} );
			} );

			this.$body.append( this.content.$element );
		};

		PageTaggingDialog.prototype.getActionProcess = function ( action ) {
			if ( !action ) {
				return PageTaggingDialog.super.prototype.getActionProcess.call( this, action );
			}

			return new OO.ui.Process( () => {
				preparedTemplates.length = 0;
				preparedTagsString = '';
				const uniqueSelectedTags = Array.from( new Set( selectedTags ) );
				if ( uniqueSelectedTags.length === 0 ) {
					mw.notify( mw.msg( 'select-a-tag' ), {
						title: mw.msg( 'operation-failed' ),
						type: 'error'
					} );
					return undefined;
				}
				let hasParamError = false;
				for ( const tag of uniqueSelectedTags ) {
					const templateName = tag.tag ? tag.tag.trim() : '';
					if ( !templateName ) {
						continue;
					}
					if ( tag.items && tag.items.length > 0 ) {
						const params = collectTagParams( tag.items );
						if ( params === null ) {
							hasParamError = true;
							break;
						}
						const template = params.length ?
							'{{' + templateName + '|' + params.join( '|' ) + '}}' :
							'{{' + templateName + '}}';
						preparedTemplates.push( template );
					} else {
						preparedTemplates.push( '{{' + templateName + '}}' );
					}
				}
				if ( hasParamError ) {
					return undefined;
				}
				if ( preparedTemplates.length === 0 ) {
					mw.notify( mw.msg( 'select-a-tag' ), {
						title: mw.msg( 'operation-failed' ),
						type: 'error'
					} );
					return undefined;
				}
				if ( useMultipleIssuesTemplate && preparedTemplates.length > 1 ) {
					preparedTagsString = '{{' + multipleIssuesTemplate + '|\n' +
						preparedTemplates.join( '\n' ) + '\n}}';
				} else {
					preparedTagsString = preparedTemplates.join( '\n' );
				}
				return tagPage().then( () => {
					this.close( {
						action: action
					} );
				} );
			} );
		};

		const windowManager = new OO.ui.WindowManager();
		$( document.body ).append( windowManager.$element );
		const dialog = new PageTaggingDialog( {
			size: 'large'
		} );
		windowManager.addWindows( [ dialog ] );
		windowManager.openWindow( dialog );

		function updateSelectedTags( selected, tag ) {
			if ( selected ) {
				if ( !selectedTags.includes( tag ) ) {
					selectedTags.push( tag );
				}
			} else {
				selectedTags = selectedTags.filter( ( item ) => item !== tag );
			}
		}

		function collectTagParams( items ) {
			const params = [];
			for ( const item of items ) {
				if ( item.type === 'input' ) {
					const value = item.widget && typeof item.widget.getValue === 'function' ?
						String( item.widget.getValue() ).trim() :
						'';
					if ( item.required && !value ) {
						mw.notify( 'Missing required field: ' + item.label, {
							title: mw.msg( 'operation-failed' ),
							type: 'error'
						} );
						return null;
					}
					if ( value ) {
						if ( item.parameter ) {
							params.push( item.parameter + '=' + value );
						} else {
							params.push( value );
						}
					}
				}
				if ( item.type === 'checkbox' ) {
					const isSelected = item.widget &&
						typeof item.widget.isSelected === 'function' &&
						item.widget.isSelected();
					if ( isSelected ) {
						if ( item.parameter ) {
							params.push( item.parameter + '=' + item.value );
						} else if ( item.value ) {
							params.push( item.value );
						}
					}
				}
				if ( item.items && item.items.length ) {
					const nestedParams = collectTagParams( item.items );
					if ( nestedParams === null ) {
						return null;
					}
					params.push( ...nestedParams );
				}
			}
			return params;
		}

		function tagPage() {
			const editParams = {
				action: 'edit',
				title: mw.config.get( 'wgPageName' ),
				summary: apiPostSummary,
				tags: 'Adiutor',
				format: 'json'
			};
			let removedContent = '';
			const modifiedTags = preparedTagsString.replace(
				'{{' + uncategorizedTemplate + '}}',
				( match ) => {
					removedContent = match;
					return '';
				}
			);
			if ( removedContent ) {
				editParams.prependtext = modifiedTags.split( ',' ).join( '\n' ) + '\n';
				editParams.appendtext = '\n' + removedContent;
			} else {
				editParams.prependtext = modifiedTags.split( ',' ).join( '\n' ) + '\n';
			}
			return api.postWithToken( 'csrf', editParams ).then( () => {
				adiutorUserOptions.stats.pageTags++;
				return api.postWithEditToken( {
					action: 'globalpreferences',
					format: 'json',
					optionname: 'userjs-adiutor-' + mw.config.get( 'wgWikiID' ),
					optionvalue: JSON.stringify( adiutorUserOptions ),
					formatversion: 2
				} );
			} ).then( () => {
				location.reload();
			} ).catch( () => {
				mw.notify( mw.msg( 'operation-failed' ), {
					title: mw.msg( 'error' ),
					type: 'error'
				} );
				throw new Error( 'Tagging failed.' );
			} );
		}
	}

	module.exports = {
		callBack: callBack
	};
}() );

/* </nowiki> */
