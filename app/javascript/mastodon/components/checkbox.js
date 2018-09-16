import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export default class Checkbox extends React.PureComponent {

  constructor() {
    super();
    this.state = { isChecked: false };
    this.handleChecked = this.handleChecked.bind(this);
  }

  static propTypes = {
    text: PropTypes.node,
    onChange: PropTypes.func,
    disabled: PropTypes.bool,
    className: PropTypes.string,
    style: PropTypes.object,
    children: PropTypes.node,
  };

  handleChecked = () => {
    let fcLocal = JSON.parse(localStorage.getItem('friend-camp')) || {};
    fcLocal.confirmClearNotificationsNeverAsk = !this.state.isChecked;
    localStorage.setItem('friend-camp', JSON.stringify(fcLocal));
    this.setState({ isChecked: !this.state.isChecked });
  }

  setRef = (c) => {
    this.node = c;
  }

  render () {
    const style = {
      ...this.props.style,
    };

    const className = classNames('fc-checkbox', this.props.className);

    return (
      <label
        className={className}
      >
        <input
          disabled={this.props.disabled}
          type='checkbox'
          onChange={this.handleChecked}
          ref={this.setRef}
          style={style}
        />
        {this.props.text || this.props.children}
      </label>
    );
  }

}
