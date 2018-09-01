import React from 'react';
import ImmutablePropTypes from 'react-immutable-proptypes';
import PropTypes from 'prop-types';
import { isRtl } from '../rtl';
import { FormattedMessage } from 'react-intl';
import Permalink from './permalink';
import classnames from 'classnames';
import { MediaGallery, Video } from '../features/ui/util/async-components';
import Bundle from '../features/ui/components/bundle';
import AttachmentList from './attachment_list';
import ReactDOMServer from 'react-dom/server';

export default class StatusContent extends React.PureComponent {

  static contextTypes = {
    router: PropTypes.object,
  };

  static propTypes = {
    status: ImmutablePropTypes.map.isRequired,
    expanded: PropTypes.bool,
    onExpandedToggle: PropTypes.func,
    onClick: PropTypes.func,
    onOpenMedia: PropTypes.func,
    detailed: PropTypes.bool,
  };

  state = {
    hidden: true,
  };

  _updateStatusLinks () {
    const node = this.node;

    if (!node) {
      return;
    }

    const links = node.querySelectorAll('a');

    for (var i = 0; i < links.length; ++i) {
      let link = links[i];
      if (link.classList.contains('status-link')) {
        continue;
      }
      link.classList.add('status-link');

      let mention = this.props.status.get('mentions').find(item => link.href === item.get('url'));

      if (mention) {
        link.addEventListener('click', this.onMentionClick.bind(this, mention), false);
        link.setAttribute('title', mention.get('acct'));
        if (mention.get('acct') === mention.get('username')) {
          link.innerHTML = `@<span class="fc-mention-local">${mention.get('acct')}</span>`;
        }
        else {
          link.innerHTML = `@<span class="fc-mention-remote">${mention.get('acct')}</span>`;
        }
      } else if (link.textContent[0] === '#' || (link.previousSibling && link.previousSibling.textContent && link.previousSibling.textContent[link.previousSibling.textContent.length - 1] === '#')) {
        link.addEventListener('click', this.onHashtagClick.bind(this, link.text), false);
      } else {
        link.setAttribute('title', link.href);
      }

      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener');
    }
  }

  componentDidMount () {
    this._updateStatusLinks();
  }

  componentDidUpdate () {
    this._updateStatusLinks();
  }

  handleOpenVideo = (media, startTime) => {
    this.props.onOpenVideo(media, startTime);
  }

  onMentionClick = (mention, e) => {
    if (this.context.router && e.button === 0 && !(e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.context.router.history.push(`/accounts/${mention.get('id')}`);
    }
  }

  onHashtagClick = (hashtag, e) => {
    hashtag = hashtag.replace(/^#/, '').toLowerCase();

    if (this.context.router && e.button === 0 && !(e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.context.router.history.push(`/timelines/tag/${hashtag}`);
    }
  }

  handleMouseDown = (e) => {
    this.startXY = [e.clientX, e.clientY];
  }

  handleMouseUp = (e) => {
    if (!this.startXY) {
      return;
    }

    const [ startX, startY ] = this.startXY;
    const [ deltaX, deltaY ] = [Math.abs(e.clientX - startX), Math.abs(e.clientY - startY)];

    if (e.target.localName === 'button' || e.target.localName === 'a' || (e.target.parentNode && (e.target.parentNode.localName === 'button' || e.target.parentNode.localName === 'a'))) {
      return;
    }

    if (deltaX + deltaY < 5 && e.button === 0 && this.props.onClick) {
      this.props.onClick();
    }

    this.startXY = null;
  }

  handleSpoilerClick = (e) => {
    e.preventDefault();

    if (this.props.onExpandedToggle) {
      // The parent manages the state
      this.props.onExpandedToggle();
    } else {
      this.setState({ hidden: !this.state.hidden });
    }
  }

  setRef = (c) => {
    this.node = c;
  }

  render () {
    const { status } = this.props;

    let media = null;

    if (status.get('content').length === 0 && status.get('media_attachments').size === 0) {
      return null;
    }

    const hidden = this.props.onExpandedToggle ? !this.props.expanded : this.state.hidden;

    const content = { __html: status.get('contentHtml') };
    const spoilerContent = { __html: status.get('spoilerHtml') };
    const directionStyle = { direction: 'ltr' };
    const classNames = classnames('status__content', {
      'status__content--with-action': this.props.onClick && this.context.router,
      'status__content--with-spoiler': status.get('spoiler_text').length > 0,
    });

    if (isRtl(status.get('search_index'))) {
      directionStyle.direction = 'rtl';
    }

    if (!this.props.detailed && status.get('media_attachments').size > 0) {
      if (this.props.muted || status.get('media_attachments').some(item => item.get('type') === 'unknown')) {
        media = (
          <AttachmentList
            compact
            media={status.get('media_attachments')}
          />
        );
      } else if (status.getIn(['media_attachments', 0, 'type']) === 'video') {
        const video = status.getIn(['media_attachments', 0]);

        media = (
          <Bundle fetchComponent={Video} loading={this.renderLoadingVideoPlayer} >
            {Component => (
              <Component
                preview={video.get('preview_url')}
                src={video.get('url')}
                width={239}
                height={110}
                inline
                sensitive={false}
                onOpenVideo={this.handleOpenVideo}
              />
            )}
          </Bundle>
        );
      } else {
        media = (
          <Bundle fetchComponent={MediaGallery} loading={this.renderLoadingMediaGallery}>
            {Component => <Component media={status.get('media_attachments')} sensitive={false} height={110} onOpenMedia={this.props.onOpenMedia ? this.props.onOpenMedia.bind(this) : undefined} />}
          </Bundle>
        );
      }
    }

    if (status.get('spoiler_text').length > 0) {
      let mentionsPlaceholder = '';

      const mentionLinks = status.get('mentions').map(item => (
        <Permalink to={`/accounts/${item.get('id')}`} href={item.get('url')} key={item.get('id')} className='mention'>
          @<span>{item.get('username')}</span>
        </Permalink>
      )).reduce((aggregate, item) => [...aggregate, item, ' '], []);

      const toggleText = hidden ? <FormattedMessage id='status.show_more' defaultMessage='Show more' /> : <FormattedMessage id='status.show_less' defaultMessage='Show less' />;

      if (hidden) {
        mentionsPlaceholder = <div>{mentionLinks}</div>;
      }

      return (
        <div className={classNames} ref={this.setRef} tabIndex='0' style={directionStyle} onMouseDown={this.handleMouseDown} onMouseUp={this.handleMouseUp}>
          <p style={{ marginBottom: hidden && status.get('mentions').isEmpty() ? '0px' : null }}>
            <span dangerouslySetInnerHTML={spoilerContent} />
            {' '}
            <button tabIndex='0' className={`status__content__spoiler-link ${hidden ? 'status__content__spoiler-link--show-more' : 'status__content__spoiler-link--show-less'}`} onClick={this.handleSpoilerClick}>{toggleText}</button> <span>{media ? <i className='fa fa-eye' /> : ''}</span>
          </p>

          {mentionsPlaceholder}

          <div tabIndex={!hidden ? 0 : null} className={`status__content__text ${!hidden ? 'status__content__text--visible' : ''}`} style={directionStyle}>
           <span dangerouslySetInnerHTML={content}></span>
           {media}
          </div>
        </div>
      );
    } else if (this.props.onClick) {
      return (
        <div
          ref={this.setRef}
          tabIndex='0'
          className={classNames}
          style={directionStyle}
          onMouseDown={this.handleMouseDown}
          onMouseUp={this.handleMouseUp}
        >
          <span dangerouslySetInnerHTML={content} />
          {media ? media : <span></span>}
        </div>
      );
    } else {
      return (
        <div
          tabIndex='0'
          ref={this.setRef}
          className='status__content'
          style={directionStyle}
        >
          <span dangerouslySetInnerHTML={content} />
          {media ? media : <span></span>}
        </div>
      );
    }
  }

}
