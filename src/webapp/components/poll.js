import React from 'react';
import List from '@material-ui/core/List';
import Divider from '@material-ui/core/Divider';
import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';
import PropTypes from 'prop-types';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import {withStyles} from '@material-ui/core/styles';
import escapeHtml from 'escape-html';
import {PublicKey} from '@solana/web3.js';

import PollOption from './poll-option';

const styles = theme => ({
  root: {
    flexGrow: 1,
  },
  header: {
    marginBottom: theme.spacing.unit * 2,
  },
  divider: {
    marginTop: theme.spacing.unit * 2,
    marginBottom: theme.spacing.unit * 2,
  },
  poll: {
    margin: theme.spacing.unit * 2,
    paddingTop: theme.spacing.unit * 2,
    paddingBottom: theme.spacing.unit * 2,
    textAlign: 'center',
    color: theme.palette.text.secondary,
  },
  option: {
    display: 'flex',
  },
  rightIcon: {
    marginLeft: theme.spacing.unit,
  },
  footer: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  submit: {
    marginLeft: theme.spacing.unit * 2,
  },
});

class Poll extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      wager: '100',
    };
  }

  renderLoading() {
    return 'Loading';
  }

  renderClaimReward() {
    return (
      <React.Fragment>
        <Button
          variant="contained"
          color="primary"
          className={this.props.classes.button}
          onClick={() => this.props.onClaim()}
        >
          Submit Claim
        </Button>
      </React.Fragment>
    );
  }

  renderWagerInput() {
    const {classes, onSubmit, poll} = this.props;
    const wager = parseInt(this.state.wager);
    const validWager = Number.isInteger(wager) && wager > 0;

    let optionAQuantity = parseInt(poll.optionA.quantity.toString());
    let optionBQuantity = parseInt(poll.optionB.quantity.toString());

    let tallyKey;
    if (this.state.selectedOption === 1) {
      tallyKey = poll.optionA.tallyKey;
      optionAQuantity += wager;
    } else {
      tallyKey = poll.optionB.tallyKey;
      optionBQuantity += wager;
    }
    const wagerError =
      optionAQuantity === optionBQuantity ? 'Cannot make poll equal' : '';

    return (
      <React.Fragment>
        <TextField
          error={!!wagerError}
          label="Wager"
          value={this.state.wager}
          onChange={e => this.setState({wager: e.target.value})}
          type="number"
          InputLabelProps={{
            shrink: true,
          }}
          margin="normal"
          variant="standard"
          helperText={wagerError}
        />
        <Button
          variant="contained"
          color="primary"
          disabled={!validWager || !this.state.selectedOption}
          className={`${classes.button} ${classes.submit}`}
          onClick={() => onSubmit(wager, tallyKey)}
        >
          Submit
        </Button>
      </React.Fragment>
    );
  }

  renderFooter() {
    const {classes} = this.props;
    if (this.slotsLeft() <= 0 && this.alreadyClaimed()) return null;
    return (
      <React.Fragment>
        <Divider className={classes.divider} />
        <div className={classes.footer}>
          {this.slotsLeft() > 0
            ? this.renderWagerInput()
            : this.renderClaimReward()}
        </div>
      </React.Fragment>
    );
  }

  slotsLeft() {
    const {poll, clock} = this.props;
    const lastBlock = parseInt(poll.last_block.toString());
    const slotsLeft = lastBlock - clock;
    if (slotsLeft <= 0) {
      return 0;
    } else {
      return slotsLeft;
    }
  }

  alreadyClaimed() {
    return this.props.balance <= 1;
  }

  getWager(tallyIndex) {
    const {payerKey, tallies} = this.props;
    const keys = tallies[tallyIndex].keys;
    const values = tallies[tallyIndex].values;
    for (const [i, key] of keys.entries()) {
      let tallyKey = new PublicKey(key);
      if (tallyKey.equals(payerKey)) {
        return parseInt(values[i].toString());
      }
    }
    return null;
  }

  renderHeader() {
    const slotsLeft = this.slotsLeft();
    const expired = slotsLeft === 0;
    const claimed = this.alreadyClaimed();
    if (expired) {
      const myAWager = this.getWager(0);
      const myBWager = this.getWager(1);
      const winner = this.getWinner();
      if (myAWager || myBWager) {
        if (myAWager > myBWager && winner === 1) {
          return !claimed ? 'Claim your reward!' : 'You won!';
        } else if (myBWager > myAWager && winner === 2) {
          return !claimed ? 'Claim your reward!' : 'You won!';
        } else if (winner === 0) {
          return 'No winners';
        } else {
          return 'You lost!';
        }
      } else {
        return 'Expired!';
      }
    } else {
      return `${slotsLeft} slots remaining`;
    }
  }

  getWinner() {
    const {poll} = this.props;
    const expired = this.slotsLeft() === 0;
    let winner = 0;
    if (expired) {
      if (poll.optionA.quantity > poll.optionB.quantity) {
        winner = 1;
      } else if (poll.optionB.quantity > poll.optionA.quantity) {
        winner = 2;
      }
    }
    return winner;
  }

  renderPoll() {
    const {poll, classes} = this.props;
    const expired = this.slotsLeft() === 0;
    const winner = this.getWinner();

    return (
      <React.Fragment>
        {this.renderHeader()}
        <Typography className={classes.header} variant="h6" noWrap>
          {escapeHtml(poll.header)}
        </Typography>
        <div className={classes.root}>
          <List>
            {[poll.optionA, poll.optionB].map((option, index) => (
              <PollOption
                key={index}
                option={option}
                expired={expired}
                wager={this.getWager(index)}
                winner={winner === index + 1}
                selected={this.state.selectedOption === index + 1}
                onClick={() => this.setState({selectedOption: index + 1})}
              />
            ))}
          </List>
        </div>
        {this.renderFooter()}
      </React.Fragment>
    );
  }

  render() {
    const {poll, classes} = this.props;
    const stillLoading = !poll;

    return (
      <Paper className={classes.poll}>
        {stillLoading ? this.renderLoading() : this.renderPoll()}
      </Paper>
    );
  }
}

Poll.propTypes = {
  classes: PropTypes.object.isRequired,
  poll: PropTypes.object,
  balance: PropTypes.number,
  tallies: PropTypes.array,
  onSubmit: PropTypes.func.isRequired,
  onClaim: PropTypes.func.isRequired,
  clock: PropTypes.number.isRequired,
  payerKey: PropTypes.object.isRequired,
};

export default withStyles(styles)(Poll);
