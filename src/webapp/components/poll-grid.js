import React from 'react';
import Grid from '@material-ui/core/Grid';
import PropTypes from 'prop-types';
import {withStyles} from '@material-ui/core/styles';

import Poll from './poll';

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
    const {polls, classes} = this.props;
    const renderPolls = polls
      .map(([key, poll]) => this.renderPoll(poll, key))
      .reverse();

    return (
      <div className={classes.root}>
        <Grid container spacing={8}>
          {renderPolls}
        </Grid>
      </div>
    );
  }

  renderPoll(poll, key) {
    const onSubmit = (wager, tally) => this.props.onVote(key, wager, tally);
    const onClaim = () => this.props.onClaim(poll, key);
    const {clock} = this.props;
    return (
      <Grid key={key} item xs={12} lg={6}>
        <Poll clock={clock} poll={poll} onSubmit={onSubmit} onClaim={onClaim} />
      </Grid>
    );
  }
}

PollGrid.propTypes = {
  classes: PropTypes.object.isRequired,
  polls: PropTypes.array.isRequired,
  onVote: PropTypes.func.isRequired,
  onClaim: PropTypes.func.isRequired,
  clock: PropTypes.number.isRequired,
};

export default withStyles(styles)(PollGrid);
