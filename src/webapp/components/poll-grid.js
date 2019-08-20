import React from 'react';
import Grid from '@material-ui/core/Grid';
import PropTypes from 'prop-types';
import {withStyles} from '@material-ui/core/styles';

import Poll from './poll';
import CreatePollDialog from './create-poll';

const styles = () => ({
  root: {
    flexGrow: 1,
  },
});

class PollGrid extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      selectedOptions: false,
      banUserDialogOpen: false,
    };
  }

  render() {
    const {polls, classes, payerBalance, busy} = this.props;
    const lastBlock = poll => parseInt(poll.last_block.toString());
    polls.sort(function(a, b) {
      return lastBlock(a[1]) - lastBlock(b[1]);
    });

    const renderPolls = polls
      .map(([...args]) => this.renderPoll(...args))
      .reverse();

    return (
      <div className={classes.root}>
        <Grid container spacing={8} justify="center" alignItems="center">
          {renderPolls}
        </Grid>
        <CreatePollDialog
          disabled={busy || !payerBalance}
          onCreate={(...args) => this.props.onCreate(...args)}
        />
      </div>
    );
  }

  renderPoll(key, poll, balance, tallies) {
    const onSubmit = (wager, tally) => this.props.onVote(key, wager, tally);
    const onClaim = () => this.props.onClaim(poll, key);
    const {clock, payerKey} = this.props;
    return (
      <Grid key={key} item xs={12} md={8}>
        <Poll
          clock={clock}
          poll={poll}
          balance={balance}
          payerKey={payerKey}
          tallies={tallies}
          onSubmit={onSubmit}
          onClaim={onClaim}
        />
      </Grid>
    );
  }
}

PollGrid.propTypes = {
  classes: PropTypes.object.isRequired,
  polls: PropTypes.array.isRequired,
  onVote: PropTypes.func.isRequired,
  onClaim: PropTypes.func.isRequired,
  onCreate: PropTypes.func.isRequired,
  clock: PropTypes.number.isRequired,
  busy: PropTypes.bool.isRequired,
  payerBalance: PropTypes.number.isRequired,
  payerKey: PropTypes.object.isRequired,
};

export default withStyles(styles)(PollGrid);
