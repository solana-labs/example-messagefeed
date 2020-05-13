import React from 'react';
import PropTypes from 'prop-types';

import {balanceInSOL} from '../../util/display-sol';

class Balance extends React.Component {
  render() {
    if (this.props.displayLamports) {
      return `${this.props.balance} lamports`;
    } else {
      return `${balanceInSOL(this.props.balance)} SOL`;
    }
  }
}

Balance.propTypes = {
  balance: PropTypes.number.isRequired,
  displayLamports: PropTypes.bool,
};

export default Balance;
