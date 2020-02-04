import React from 'react';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import StarsIcon from '@material-ui/icons/Stars';
import CheckCircleOutlineIcon from '@material-ui/icons/CheckCircleOutline';
import PropTypes from 'prop-types';

import Balance from './balance';

class PollOption extends React.Component {
  render() {
    if (this.props.expired) {
      return this.renderExpired();
    } else {
      return this.renderActive();
    }
  }

  renderExpired() {
    return <ListItem disabled={true}>{this.renderText()}</ListItem>;
  }

  renderActive() {
    const {onClick, selected} = this.props;
    return (
      <ListItem button onClick={onClick} selected={selected}>
        {this.renderIcon()}
        {this.renderText()}
      </ListItem>
    );
  }

  renderIcon() {
    const {selected, winner} = this.props;
    return (
      <ListItemIcon>
        {winner ? (
          <StarsIcon color="secondary" />
        ) : selected ? (
          <CheckCircleIcon color="primary" />
        ) : (
          <CheckCircleOutlineIcon />
        )}
      </ListItemIcon>
    );
  }

  renderText() {
    const {option, wager} = this.props;
    let totalWager = (
      <>
        {`Wager total: `}
        <Balance balance={option.quantity} />
      </>
    );

    let myWager = (
      <>
        {`, My wager: `}
        <Balance balance={wager} />
      </>
    );

    let secondary = (
      <>
        {totalWager}
        {wager > 0 ? myWager : undefined}
      </>
    );

    return <ListItemText primary={option.text} secondary={secondary} />;
  }
}

PollOption.propTypes = {
  option: PropTypes.object.isRequired,
  expired: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
  selected: PropTypes.bool.isRequired,
  winner: PropTypes.bool.isRequired,
  wager: PropTypes.number.isRequired,
};

export default PollOption;
