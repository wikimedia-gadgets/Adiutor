/* <nowiki> */

/**
 * @file adiutor-inf.js
 * @description Inline article info module for displaying page metadata within the article view.
 * @license CC BY-SA 4.0
 */

( function () {
	'use strict';

	/**
	 * Attach inline article info actions.
	 *
	 * @return {void}
	 */
	function callBack() {
		/** @type {mw.Api} */
		const api = new mw.Api();
		const $body = $( document.body );
		const mwConfig = {
			wgPageName: /** @type {string} */ ( mw.config.get( 'wgPageName' ) )
		};

		const apiUrl = 'https://xtools.wmcloud.org/api/page/articleinfo/' +
			mw.config.get( 'wgServerName' ) + '/' +
			encodeURIComponent( mwConfig.wgPageName ) + '?format=json';

		$.ajax( {
			url: apiUrl,
			method: 'GET',
			dataType: 'json'
		} ).then( ( response ) => {
			const infoButton = new OO.ui.ButtonWidget( {
				icon: 'info'
			} );

			const aboutArticleActionButtons = new OO.ui.ButtonGroupWidget( {
				items: [ infoButton ],
				classes: [ 'adiutor-article-detail-box-button-group' ]
			} );

			const authorLink = '<strong><a href="/wiki/User:' +
				response.author + '">' + response.author + '</a></strong>';

			infoButton.on( 'click', () => {
				api.get( {
					action: 'query',
					prop: 'revisions',
					titles: mw.config.get( 'wgPageName' ),
					rvprop: 'user|content|timestamp',
					rvlimit: 1,
					formatversion: 2
				} ).then( ( data ) => {
					const revision = data.query.pages[ 0 ].revisions[ 0 ];
					let text = revision.content;
					text = text.replace( /{{[^}]+}}/g, '' );
					text = text.replace( /\[\[Kategori:[^\]]+\]\]/g, '' );
					text = text.replace( /==[ ]*Kaynakça[ ]*==[\s\S]*/g, '' );
					text = text.replace( /==[ ]*Dış bağlantılar[ ]*==[\s\S]*/g, '' );
					text = text.replace( /^\*.*$/gm, '' );
					text = text.replace( /{\|[^}]+}\|/g, '' );
					const words = text.match( /\b\w+\b/g );
					const wordCount = words ? words.length : 0;

					function ArticleInfoDialog( config ) {
						ArticleInfoDialog.super.call( this, config );
					}

					OO.inheritClass( ArticleInfoDialog, OO.ui.ProcessDialog );
					ArticleInfoDialog.static.title = mw.config.get( 'wgPageName' );
					ArticleInfoDialog.static.name = 'ArticleInfoDialog';
					ArticleInfoDialog.static.actions = [ {
						action: 'continue',
						modes: 'edit',
						label: OO.ui.deferMsg( 'okay' ),
						flags: [ 'primary', 'progressive' ]
					}, {
						action: 'policy',
						modes: 'edit',
						label: mw.msg( 'more-about-this-page' ),
						framed: false
					}, {
						modes: 'edit',
						label: OO.ui.deferMsg( 'cancel' ),
						flags: [ 'safe', 'close' ]
					}, {
						action: 'back',
						modes: 'help',
						label: OO.ui.deferMsg( 'back' ),
						flags: [ 'safe', 'back' ]
					} ];
					ArticleInfoDialog.prototype.initialize = function () {
						ArticleInfoDialog.super.prototype.initialize.apply( this, arguments );
						const authorMessage = mw.msg( 'page-more-info-tip-author' )
							.replace( /\$1/g, authorLink );
						const articleCreator = new OO.ui.MessageWidget( {
							type: 'warning',
							icon: 'infoFilled',
							inline: false,
							label: new OO.ui.HtmlSnippet(
								mw.msg( 'page-more-info-tip-author-title' ) + '<br>' + authorMessage
							),
							classes: [ 'adiutor-page-more-info-tip-author' ]
						} );
						const articleDate = new OO.ui.MessageWidget( {
							type: 'notice',
							icon: 'edit',
							inline: false,
							label: new OO.ui.HtmlSnippet(
								mw.msg( 'page-more-info-tip-date-title' ) + '<br>' +
									mw.msg( 'page-more-info-tip-date', response.created_at )
							),
							classes: [ 'adiutor-page-more-info-tip-date' ]
						} );
						const wordCountLabel = new OO.ui.MessageWidget( {
							type: 'notice',
							icon: 'article',
							inline: false,
							label: new OO.ui.HtmlSnippet(
								mw.msg( 'page-more-info-tip-keyword-title' ) + '<br>' +
									mw.msg( 'page-more-info-tip-keyword', wordCount )
							),
							classes: [ 'adiutor-page-more-info-tip-keyword' ]
						} );
						this.$body.append(
							articleCreator.$element,
							articleDate.$element,
							wordCountLabel.$element
						);
					};
					ArticleInfoDialog.prototype.getSetupProcess = function ( dialogData ) {
						return ArticleInfoDialog.super.prototype.getSetupProcess
							.call( this, dialogData )
							.next( function () {
								this.actions.setMode( 'edit' );
							}, this );
					};
					ArticleInfoDialog.prototype.getActionProcess = function ( action ) {
						if ( action === 'continue' ) {
							return new OO.ui.Process( () => this.close() );
						}
						return ArticleInfoDialog.super.prototype.getActionProcess.call(
							this,
							action
						);
					};
					const windowManager = new OO.ui.WindowManager();
					$( document.body ).append( windowManager.$element );
					const dialog = new ArticleInfoDialog( {
						size: 'medium'
					} );
					windowManager.addWindows( [ dialog ] );
					windowManager.openWindow( dialog );
				} );
			} );

			const translation = mw.msg( 'page-info-tip' );
			const translatedText = translation
				.replace( /\$1/g, '<strong>' + response.created_at + '</strong>' )
				.replace( /\$2/g, authorLink )
				.replace( /\$3/g, response.author_editcount )
				.replace( /\$4/g, response.revisions )
				.replace( /\$5/g, response.editors )
				.replace( /\$6/g, '<strong>' + response.pageviews + '</strong>' )
				.replace( /\$7/g, response.pageviews_offset );

			$body.find( '.mw-indicators' ).append(
				$( '<div>' )
					.addClass( 'mw-indicator' )
					.html( translatedText )
			);
			$body.find( '.mw-indicators' ).append( aboutArticleActionButtons.$element );
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
