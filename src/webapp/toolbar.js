import AppBar from '@material-ui/core/AppBar';
import Badge from '@material-ui/core/Badge';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import ExploreIcon from '@material-ui/icons/Explore';
import InputBase from '@material-ui/core/InputBase';
import PauseIcon from '@material-ui/icons/Pause';
import PropTypes from 'prop-types';
import React from 'react';
import MaterialToolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import {fade} from '@material-ui/core/styles/colorManipulator';
import {withStyles} from '@material-ui/core/styles';

const styles = theme => ({
  bar: {
    overflow: 'hidden',
  },
  funds: {
    transition: 'margin-right 100ms linear, width 100ms linear',
    position: 'relative',
    marginRight: theme.spacing.unit * 5,
    whiteSpace: 'nowrap',
  },
  fundsHidden: {
    [theme.breakpoints.down('sm')]: {
      marginRight: 0,
      width: 0,
    },
  },
  fundsText: {
    display: 'flex',
    flexDirection: 'column',
  },
  grow: {
    flexGrow: 1,
  },
  hiddenFundsText: {
    visibility: 'hidden',
    height: 0,
  },
  inputRoot: {
    color: 'inherit',
    width: '100%',
  },
  inputInput: {
    paddingTop: theme.spacing.unit,
    paddingRight: theme.spacing.unit * 2,
    paddingBottom: theme.spacing.unit,
    paddingLeft: theme.spacing.unit * 2,
    transition: theme.transitions.create('width'),
    width: '100%',
  },
  login: {
    position: 'relative',
    marginLeft: theme.spacing.unit * 3,
    marginRight: theme.spacing.unit * 4,
    whiteSpace: 'nowrap',
  },
  menuButton: {
    marginLeft: -6,
    marginRight: 20,
    minWidth: 0,
    [theme.breakpoints.up('sm')]: {
      marginLeft: -12,
    },
  },
  newMessage: {
    position: 'relative',
    borderRadius: theme.shape.borderRadius,
    backgroundColor: fade(theme.palette.common.white, 0.15),
    '&:hover': {
      backgroundColor: fade(theme.palette.common.white, 0.25),
    },
    marginRight: theme.spacing.unit * 2,
    marginLeft: 0,
    flexGrow: 1,
    [theme.breakpoints.up('sm')]: {
      marginLeft: theme.spacing.unit * 3,
    },
  },
  title: {
    display: 'none',
    [theme.breakpoints.up('sm')]: {
      display: 'block',
    },
  },
  hideSmall: {
    [theme.breakpoints.down('sm')]: {
      display: 'none',
    },
  },
  hideNotSmall: {
    [theme.breakpoints.up('sm')]: {
      display: 'none',
    },
  },
});

class Toolbar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      balanceHovered: false,
      messageInputFocused: false,
      newMessage: '',
    };
  }

  onInputKeyDown = async e => {
    if (e.keyCode !== 13) {
      return;
    }
    if (await this.props.onPostMessage(this.state.newMessage)) {
      this.setState({newMessage: ''});
    }
  };

  onInputChange = e => {
    this.setState({newMessage: e.target.value});
  };

  render() {
    const {busy, classes, explorerUrl, messageCount, idle} = this.props;
    const explorerIcon = idle ? (
      <PauseIcon />
    ) : busy ? (
      <CircularProgress
        style={{width: '24px', height: '24px'}}
        color="inherit"
      />
    ) : (
      <ExploreIcon />
    );

    return (
      <AppBar position="static" className={classes.bar}>
        <MaterialToolbar>
          <Button
            variant="contained"
            href={explorerUrl}
            disabled={!explorerUrl}
            className={classes.menuButton}
            color="secondary"
            aria-label="Block explorer"
          >
            {explorerIcon}
          </Button>
          <Badge color="secondary" badgeContent={messageCount}>
            <Typography
              className={classes.title}
              variant="h6"
              color="inherit"
              noWrap
            >
              Message Feed
            </Typography>
          </Badge>
          {this.renderMessageInput()}
          {this.renderBalanceButton()}
        </MaterialToolbar>
      </AppBar>
    );
  }

  renderMessageInput() {
    const {
      busy,
      classes,
      loginDisabled,
      onLogin,
      payerBalance,
      userAuthenticated,
    } = this.props;

    if (userAuthenticated) {
      const zeroBalance = !payerBalance;
      return (
        <div className={classes.newMessage}>
          <InputBase
            disabled={zeroBalance || busy}
            placeholder={
              zeroBalance ? 'First add funds →' : 'Say something nice…'
            }
            value={this.state.newMessage}
            classes={{
              root: classes.inputRoot,
              input: classes.inputInput,
            }}
            onFocus={() => this.setState({messageInputFocused: true})}
            onBlur={() => this.setState({messageInputFocused: false})}
            onKeyDown={this.onInputKeyDown}
            onChange={this.onInputChange}
          />
        </div>
      );
    } else {
      return (
        <React.Fragment>
          <div className={classes.login}>
            <Button
              disabled={loginDisabled}
              variant="contained"
              color="default"
              onClick={onLogin}
            >
              <span className={classes.hideSmall}>Login to start posting</span>
              <span className={classes.hideNotSmall}>Login</span>
            </Button>
          </div>
          <div className={classes.grow} />
        </React.Fragment>
      );
    }
  }

  renderBalanceButton() {
    const {classes, payerBalance, onRequestFunds, walletDisabled} = this.props;
    const text = [`Balance: ${payerBalance}`, 'Add Funds'];
    if (payerBalance === 0 || this.state.balanceHovered) {
      text.reverse();
    }
    let className = classes.funds;
    if (this.state.messageInputFocused) {
      className += ` ${classes.fundsHidden}`;
    }
    return (
      <div className={className}>
        <Button
          variant="contained"
          color="secondary"
          disabled={walletDisabled}
          onMouseOver={() => this.setState({balanceHovered: true})}
          onMouseOut={() => this.setState({balanceHovered: false})}
          onClick={onRequestFunds}
        >
          {/* Ensures that button width is not changed on hover  */}
          <div className={classes.fundsText}>
            <span>{text[0]}</span>
            <span className={classes.hiddenFundsText}>{text[1]}</span>
          </div>
        </Button>
      </div>
    );
  }
}

Toolbar.propTypes = {
  busy: PropTypes.bool.isRequired,
  classes: PropTypes.object.isRequired,
  explorerUrl: PropTypes.string,
  idle: PropTypes.bool.isRequired,
  loginDisabled: PropTypes.bool.isRequired,
  messageCount: PropTypes.number.isRequired,
  onLogin: PropTypes.func.isRequired,
  onPostMessage: PropTypes.func.isRequired,
  onRequestFunds: PropTypes.func.isRequired,
  payerBalance: PropTypes.number.isRequired,
  userAuthenticated: PropTypes.bool.isRequired,
  walletDisabled: PropTypes.bool.isRequired,
};

export default withStyles(styles)(Toolbar);
