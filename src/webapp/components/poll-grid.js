import React from 'react';
import Grid from '@material-ui/core/Grid';
import PropTypes from 'prop-types';
import Typography from '@material-ui/core/Typography';
import {withStyles} from '@material-ui/core/styles';

import Poll from './poll';
import CreatePollDialog from './create-poll';

const styles = theme => ({
  root: {
    flexGrow: 1,
  },
  empty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: theme.spacing.unit * 2,
    borderRadius: 4,
    textAlign: 'center',
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

    const renderPolls = polls
      .sort((a, b) => a[1].last_block - b[1].last_block)
      .map(([...args]) => this.renderPoll(...args))
      .reverse();

    return (
      <div className={classes.root}>
        {polls.length > 0 ? (
          <Grid container spacing={8} justify="center" alignItems="center">
            {renderPolls}
          </Grid>
        ) : (
          <div className={classes.empty}>
            <Typography variant="subtitle1">
              No polls yet, create one with the bottom right button!
            </Typography>
          </div>
        )}
        <CreatePollDialog
          disabled={busy || !payerBalance}
          onCreate={(...args) => this.props.onCreate(...args)}
        />
      </div>
    );
  }

  renderPoll(key, poll, balance, tallies) {
    const {clock, payerKey, payerBalance} = this.props;
    const onSubmit = (wager, tally) => this.props.onVote(key, wager, tally);
    const onClaim = () => this.props.onClaim(poll, key);
    return (
      <Grid key={key} item xs={12} md={8}>
        <Poll
          clock={clock}
          poll={poll}
          balance={balance}
          payerKey={payerKey}
          payerBalance={payerBalance}
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
  payerKey: PropTypes.object,
};

export default withStyles(styles)(PollGrid);
