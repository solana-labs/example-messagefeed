import AppBar from '@material-ui/core/AppBar';
import CircularProgress from '@material-ui/core/CircularProgress';
import Grid from '@material-ui/core/Grid';
import IdleTimer from 'react-idle-timer';
import InputBase from '@material-ui/core/InputBase';
import Paper from '@material-ui/core/Paper';
import PauseIcon from '@material-ui/icons/Pause';
import MenuIcon from '@material-ui/icons/Menu';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import PropTypes from 'prop-types';
import React from 'react';
import ReactDOM from 'react-dom';
import Snackbar from '@material-ui/core/Snackbar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import escapeHtml from 'escape-html';
import {Connection} from '@solana/web3.js';
import {fade} from '@material-ui/core/styles/colorManipulator';
import Badge from '@material-ui/core/Badge';
import {withStyles} from '@material-ui/core/styles';

//import {sleep} from './util/sleep';
import {getFirstMessage, refreshMessageFeed, postMessage} from './message-feed';

const styles = theme => ({
  root: {
    width: '100%',
  },
  grow: {
    flexGrow: 1,
  },
  menuButton: {
    marginLeft: -12,
    marginRight: 20,
  },
  title: {
    display: 'none',
    [theme.breakpoints.up('sm')]: {
      display: 'block',
    },
  },
  badge: {
    padding: `0 ${theme.spacing.unit * 1.5}px`,
  },
  message: {
    ...theme.mixins.gutters(),
    paddingTop: theme.spacing.unit * 2,
    paddingBottom: theme.spacing.unit * 2,
  },

  newmessage: {
    position: 'relative',
    borderRadius: theme.shape.borderRadius,
    backgroundColor: fade(theme.palette.common.white, 0.15),
    '&:hover': {
      backgroundColor: fade(theme.palette.common.white, 0.25),
    },
    marginRight: theme.spacing.unit * 2,
    marginLeft: 0,
    width: '100%',
    [theme.breakpoints.up('sm')]: {
      marginLeft: theme.spacing.unit * 3,
      width: '70%',
    },
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
});

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      busyLoading: true,
      busyPosting: false,
      idle: false,
      messages: [],
      newMessage: '',
      snackMessage: '',
      transactionSignature: null,
    };
    this.programId = null;
    this.postCount = 0;

    let configUrl = window.location.origin;
    if (window.location.hostname === 'localhost') {
      configUrl = 'http://localhost:8081';
    }
    configUrl += '/config.json';
    this.configUrl = configUrl;

    this.onActive();
  }

  busy() {
    return (
      (this.state.busyLoading || this.state.busyPosting) && !this.state.idle
    );
  }

  // Periodically polls for a new program id, which indicates either a cluster reset
  // or new message feed server deployment
  async pollForFirstMessage() {
    if (this.state.idle) {
      return;
    }

    console.log('pollForFirstMessage');
    try {
      const {firstMessage, url, programId} = await getFirstMessage(
        this.configUrl,
      );
      if (this.programId !== programId) {
        this.connection = new Connection(url);
        this.connectionUrl = url;
        this.programId = programId;
        this.firstMessage = firstMessage;

        const matches = this.connectionUrl.match(
          'https://api.(.*)testnet.solana.com',
        );
        if (matches) {
          const testnet = matches[1];
          this.blockExplorerUrl = `http://${testnet}testnet.solana.com`;
        } else {
          this.blockExplorerUrl = 'http://localhost:3000';
        }

        this.setState({busyLoading: true, messages: []});
      }
    } catch (err) {
      console.error(`pollForFirstMessage error: ${err}`);
    }
    setTimeout(() => this.pollForFirstMessage(), 10 * 1000);
  }

  // Refresh messages.
  // TODO: Rewrite this function to use the solana-web3.js websocket pubsub
  //       instead of polling
  async periodicRefresh() {
    if (this.state.idle) {
      return;
    }

    console.log('periodicRefresh');
    try {
      let {messages} = this.state;
      for (;;) {
        const {postCount} = this;
        await refreshMessageFeed(
          this.connection,
          messages,
          () => this.setState({messages}),
          messages.length === 0 ? this.firstMessage : null,
        );
        if (postCount === this.postCount) {
          break;
        }
        console.log('Post count increated, refreshing');
      }
      this.setState({busyLoading: false});
    } catch (err) {
      console.error(`periodicRefresh error: ${err}`);
    }

    setTimeout(
      () => this.periodicRefresh(),
      this.state.busyPosting ? 250 : 1000,
    );
  }

  render() {
    const {classes} = this.props;

    const messages = this.state.messages
      .map((message, i) => {
        return (
          <div key={i}>
            <br />
            <Paper className={classes.message}>
              <Typography>{escapeHtml(message.text)}</Typography>
            </Paper>
          </div>
        );
      })
      .reverse();

    return (
      <div className={classes.root}>
        <AppBar position="static">
          <Toolbar>
            <IconButton
              disabled={!this.blockExplorerUrl}
              onClick={this.onBlockExplorerTransactionsByProgram}
              className={classes.menuButton}
              color="inherit"
              aria-label="Block explorer"
            >
              <MenuIcon />
            </IconButton>
            <Badge
              className={classes.badge}
              color="secondary"
              badgeContent={this.state.messages.length}
            >
              <Typography
                className={classes.title}
                variant="h6"
                color="inherit"
                noWrap
              >
                Message Feed
              </Typography>
            </Badge>
            <div className={classes.newmessage}>
              <InputBase
                placeholder="Say something nice…"
                value={this.state.newMessage}
                classes={{
                  root: classes.inputRoot,
                  input: classes.inputInput,
                }}
                onKeyDown={this.onInputKeyDown}
                onChange={this.onInputChange}
              />
            </div>
            {this.state.idle ? <PauseIcon /> : ''}
            {this.busy() ? (
              <CircularProgress className={classes.progress} color="inherit" />
            ) : (
              ''
            )}
            <div className={classes.grow} />
          </Toolbar>
        </AppBar>
        <IdleTimer
          element={document}
          onActive={this.onActive}
          onIdle={this.onIdle}
          debounce={250}
          timeout={1000 * 60 * 15}
        />
        <Grid item xs>
          {messages}
        </Grid>
        <Snackbar
          open={this.state.snackMessage !== ''}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          autoHideDuration={6000}
          onClose={this.onSnackClose}
          ContentProps={{
            'aria-describedby': 'message-id',
          }}
          message={<span id="message-id">{this.state.snackMessage}</span>}
          action={
            this.state.transactionSignature ? (
              <Button
                color="secondary"
                size="small"
                onClick={this.onBlockExplorerLatestTransaction}
              >
                Transaction Details
              </Button>
            ) : (
              ''
            )
          }
        />
      </div>
    );
  }

  async postMessage() {
    if (this.state.newMessage.length === 0) {
      return;
    }

    if (this.state.busyPosting) {
      this.setState({
        snackMessage: 'Unable to post message, please retry when not busy',
        transactionSignature: null,
      });
      return;
    }
    this.setState({busyPosting: true});
    const {messages, newMessage} = this.state;
    try {
      const transactionSignature = await postMessage(
        this.connection,
        newMessage,
        messages[messages.length - 1].publicKey,
      );
      this.postCount++;
      this.setState({
        snackMessage: 'Message posted',
        transactionSignature,
        newMessage: '',
      });
    } catch (err) {
      console.error(`Failed to post message: ${err}`);
      this.setState({
        snackMessage: 'An error occured when posting the message',
      });
    }
    this.setState({busyPosting: false});
  }

  onInputKeyDown = e => {
    if (e.keyCode !== 13) {
      return;
    }
    this.postMessage();
  };

  onInputChange = e => {
    this.setState({newMessage: e.target.value});
  };

  onSnackClose = () => {
    this.setState({
      snackMessage: '',
      transactionSignature: null,
    });
  };

  onActive = () => {
    console.log('user is active');
    this.setState({idle: false});
    this.pollForFirstMessage();
    this.periodicRefresh();
  };

  onIdle = () => {
    console.log('user is idle');
    this.setState({idle: true});
  };

  onBlockExplorerTransactionsByProgram = () => {
    if (!this.blockExplorerUrl) return;
    window.open(`${this.blockExplorerUrl}/txns-by-prgid/${this.programId}`);
  };

  onBlockExplorerLatestTransaction = () => {
    if (!this.blockExplorerUrl) return;
    if (this.state.transactionSignature === null) return;
    window.open(
      `${this.blockExplorerUrl}/txn/${this.state.transactionSignature}`,
    );
  };
}
App.propTypes = {
  classes: PropTypes.object.isRequired,
};

const StyledApp = withStyles(styles)(App);
ReactDOM.render(<StyledApp />, document.getElementById('app'));
module.hot.accept();
