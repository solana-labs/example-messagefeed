/* global BigInt */

import React from 'react';
import Grid from '@material-ui/core/Grid';
import Divider from '@material-ui/core/Divider';
import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';
import CheckIcon from '@material-ui/icons/Check';
import PropTypes from 'prop-types';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import {withStyles} from '@material-ui/core/styles';
import escapeHtml from 'escape-html';

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
    padding: theme.spacing.unit * 2,
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

    let tallyKey;
    if (this.state.selectedOption === 1) {
      tallyKey = poll.optionA.tallyKey;
    } else {
      tallyKey = poll.optionB.tallyKey;
    }

    return (
      <React.Fragment>
        <TextField
          label="Lamport Wager"
          value={this.state.wager}
          onChange={e => this.setState({wager: e.target.value})}
          type="number"
          InputLabelProps={{
            shrink: true,
          }}
          margin="normal"
          variant="standard"
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
    return (
      <div className={classes.footer}>
        {this.slotsLeft() > 0
          ? this.renderWagerInput()
          : this.renderClaimReward()}
      </div>
    );
  }

  slotsLeft() {
    const {poll, clock} = this.props;
    const slotsLeft = poll.last_block - BigInt(clock);
    if (slotsLeft <= BigInt(0)) {
      return 0;
    } else {
      return BigInt.asUintN(64, slotsLeft);
    }
  }

  renderPoll() {
    const {poll, classes} = this.props;

    const slotsLeft = this.slotsLeft();
    let clockMsg =
      this.slotsLeft() === 0 ? 'Expired' : `${slotsLeft} slots remaining`;

    return (
      <React.Fragment>
        {clockMsg}
        <Typography className={classes.header} variant="h6" noWrap>
          {escapeHtml(poll.header)}
        </Typography>
        <div className={classes.root}>
          <Grid container spacing={16}>
            {[poll.optionA, poll.optionB].map((o, i) =>
              this.renderOption(o, i),
            )}
          </Grid>
        </div>
        <Divider className={classes.divider} />
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

  renderOption(option, index) {
    const {classes} = this.props;
    const selected = this.state.selectedOption === index + 1;
    const color = selected ? 'secondary' : 'inherit';
    const check = selected ? <CheckIcon className={classes.rightIcon} /> : null;
    return (
      <Grid className={classes.option} key={index} item xs={12}>
        <Button
          fullWidth
          variant="contained"
          color={color}
          className={classes.button}
          onClick={() => this.setState({selectedOption: index + 1})}
        >
          {escapeHtml(option.text)}
          {check}
        </Button>
      </Grid>
    );
  }
}

Poll.propTypes = {
  classes: PropTypes.object.isRequired,
  poll: PropTypes.object,
  onSubmit: PropTypes.func.isRequired,
  onClaim: PropTypes.func.isRequired,
  clock: PropTypes.number.isRequired,
};

export default withStyles(styles)(Poll);
