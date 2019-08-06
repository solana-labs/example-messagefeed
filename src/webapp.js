import AppBar from '@material-ui/core/AppBar';
import Badge from '@material-ui/core/Badge';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Grid from '@material-ui/core/Grid';
import IconButton from '@material-ui/core/IconButton';
import IdleTimer from 'react-idle-timer';
import InputBase from '@material-ui/core/InputBase';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import ExploreIcon from '@material-ui/icons/Explore';
import Paper from '@material-ui/core/Paper';
import PauseIcon from '@material-ui/icons/Pause';
import PropTypes from 'prop-types';
import React from 'react';
import ReactDOM from 'react-dom';
import ReportIcon from '@material-ui/icons/Report';
import Snackbar from '@material-ui/core/Snackbar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import escapeHtml from 'escape-html';
import {Account, Connection, PublicKey} from '@solana/web3.js';
import {fade} from '@material-ui/core/styles/colorManipulator';
import {withStyles} from '@material-ui/core/styles';
import localforage from 'localforage';

//import {sleep} from './util/sleep';
import {
  getFirstMessage,
  postMessage,
  refreshMessageFeed,
  userBanned,
  userLogin,
} from './message-feed';

const styles = theme => ({
  root: {
    width: '100%',
  },
  grow: {
    flexGrow: 1,
  },
  menuButton: {
    marginLeft: -6,
    marginRight: 20,
    minWidth: 0,
    [theme.breakpoints.up('sm')]: {
      marginLeft: -12,
    },
  },
  title: {
    display: 'none',
    [theme.breakpoints.up('sm')]: {
      display: 'block',
    },
  },
  listitem: {
    marginLeft: theme.spacing.unit,
    marginRight: theme.spacing.unit,
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
    flexGrow: 1,
    [theme.breakpoints.up('sm')]: {
      marginLeft: theme.spacing.unit * 3,
    },
  },
  login: {
    position: 'relative',
    marginLeft: theme.spacing.unit * 3,
    marginRight: theme.spacing.unit * 4,
    whiteSpace: 'nowrap',
  },
  funds: {
    position: 'relative',
    marginRight: theme.spacing.unit * 5,
    whiteSpace: 'nowrap',
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
      balanceHovered: false,
      banUserAlreadyBanned: false,
      banUserDialogOpen: false,
      banUserMessage: null,
      busyLoading: true,
      busyPosting: false,
      idle: false,
      messages: [],
      newMessage: '',
      snackMessage: '',
      transactionSignature: null,
      userAuthenticated: false,
      payerBalance: 0,
      loginMethod: 'none',
      walletUrl: '',
    };
    this.programId = null;
    this.postCount = 0;

    let baseUrl = window.location.origin;
    let hostname = window.location.hostname;
    switch (hostname) {
      case 'localhost':
      case '127.0.0.1':
      case '0.0.0.0':
        baseUrl = 'http://' + hostname + ':8081';
    }
    this.configUrl = baseUrl + '/config.json';
    this.loginUrl = baseUrl + '/login';

    this.onActive();
  }

  requestFunds() {
    const windowName = 'wallet';
    const windowOptions =
      'toolbar=no, location=no, status=no, menubar=no, scrollbars=yes, resizable=yes, width=500, height=600';
    if (!this.walletWindow) {
      window.addEventListener('message', e => this.onWalletMessage(e));
      this.walletWindow = window.open(
        this.state.walletUrl,
        windowName,
        windowOptions,
      );
    } else {
      if (this.walletWindow.closed) {
        this.walletWindow = window.open(
          this.state.walletUrl,
          windowName,
          windowOptions,
        );
      } else {
        this.walletWindow.postMessage(
          {
            method: 'addFunds',
            params: {
              pubkey: this.payerAccount.publicKey.toString(),
              amount: 150,
              network: this.connectionUrl,
            },
          },
          this.state.walletUrl,
        );
      }
    }
  }

  async onWalletMessage(e) {
    if (e.origin === window.location.origin) return;

    if (e.data) {
      switch (e.data.method) {
        case 'ready': {
          this.walletWindow.postMessage(
            {
              method: 'addFunds',
              params: {
                pubkey: this.payerAccount.publicKey.toString(),
                amount: 150,
                network: this.connectionUrl,
              },
            },
            this.state.walletUrl,
          );
          break;
        }
        case 'addFundsResponse': {
          const params = e.data.params;
          let payerBalance = this.state.payerBalance;
          let transactionSignature = null;
          let snackMessage = 'Unexpected wallet response';
          if (params.amount && params.signature) {
            snackMessage = `Received ${params.amount} from wallet`;
            transactionSignature = params.signature;
            payerBalance = await this.connection.getBalance(
              this.payerAccount.publicKey,
            );
          } else if (params.err) {
            snackMessage = 'Funds request failed';
          }
          this.setState({payerBalance, snackMessage, transactionSignature});
          break;
        }
      }
    }
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
      let userAuthenticated = false;
      let payerBalance = 0;
      const {
        firstMessage,
        loginMethod,
        url,
        walletUrl,
        programId,
      } = await getFirstMessage(this.configUrl);

      if (!this.programId || !programId.equals(this.programId)) {
        this.connection = new Connection(url);
        this.connectionUrl = url;
        this.programId = programId;
        this.firstMessage = firstMessage;
        this.userAccount = null;
        this.payerAccount = null;

        try {
          const savedProgramId = await localforage.getItem('programId');
          const savedUserAccount = await localforage.getItem('userAccount');
          if (
            savedUserAccount &&
            savedProgramId &&
            programId.equals(new PublicKey(savedProgramId))
          ) {
            this.userAccount = new Account(savedUserAccount);
            console.log(
              'Restored user account:',
              this.userAccount.publicKey.toString(),
            );

            userAuthenticated = true;
          }

          const savedPayerAccount = await localforage.getItem('payerAccount');
          if (savedPayerAccount !== null) {
            this.payerAccount = new Account(savedPayerAccount);
            payerBalance = await this.connection.getBalance(
              this.payerAccount.publicKey,
            );
          } else {
            this.payerAccount = new Account();
            await localforage.setItem(
              'payerAccount',
              this.payerAccount.secretKey,
            );
          }
        } catch (err) {
          console.log(`Unable to fetch programId from localforage: ${err}`);
        }

        const matches = this.connectionUrl.match(
          'https://api.(.*)testnet.solana.com',
        );
        if (matches) {
          const testnet = matches[1];
          this.blockExplorerUrl = `http://${testnet}testnet.solana.com`;
        } else {
          this.blockExplorerUrl = 'http://localhost:3000';
        }

        this.setState({
          busyLoading: true,
          messages: [],
          loginMethod,
          walletUrl,
          payerBalance,
          userAuthenticated,
        });
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
        if (this.connection && this.payerAccount) {
          const payerBalance = await this.connection.getBalance(
            this.payerAccount.publicKey,
          );
          this.setState({payerBalance});
        }
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

  renderBalanceButton() {
    const {classes} = this.props;
    const text = this.state.balanceHovered
      ? 'Add Funds'
      : `Balance: ${this.state.payerBalance}`;
    return (
      <React.Fragment>
        <div className={classes.funds}>
          <Button
            variant="contained"
            color="secondary"
            disabled={!this.state.walletUrl}
            onMouseOver={() => this.setState({balanceHovered: true})}
            onMouseOut={() => this.setState({balanceHovered: false})}
            onClick={() => this.requestFunds()}
          >
            {text}
          </Button>
        </div>
      </React.Fragment>
    );
  }

  render() {
    const {classes} = this.props;

    const messages = this.state.messages
      .map((message, i) => {
        const fromUser =
          this.userAccount && message.from.equals(this.userAccount.publicKey);
        return (
          <List key={i} className={classes.listitem}>
            <Paper className={classes.message}>
              <ListItem>
                <ListItemText
                  primary={escapeHtml(message.text)}
                  secondary={
                    'Posted by ' + message.name + (fromUser ? ' (you)' : '')
                  }
                />
                <ListItemSecondaryAction>
                  {!this.state.userAuthenticated || fromUser || i === 0 ? (
                    ''
                  ) : (
                    <IconButton
                      edge="end"
                      aria-label="Report"
                      onClick={() => this.onBanUser(message)}
                    >
                      <ReportIcon />
                    </IconButton>
                  )}
                </ListItemSecondaryAction>
              </ListItem>
            </Paper>
          </List>
        );
      })
      .reverse();

    let banUserDialog;
    if (this.state.banUserMessage !== null) {
      const user = this.state.banUserMessage.name;

      if (this.state.banUserAlreadyBanned) {
        banUserDialog = (
          <Dialog
            open={this.state.banUserDialogOpen}
            onClose={this.onBanUserDialogClose}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
          >
            <DialogTitle id="alert-dialog-title">{`Ban ${user}`}</DialogTitle>
            <DialogContent>
              <DialogContentText id="alert-dialog-description">
                <b>{user}</b> has already been banned
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button
                autoFocus
                onClick={this.onBanUserDialogClose}
                color="primary"
              >
                Close
              </Button>
            </DialogActions>
          </Dialog>
        );
      } else {
        banUserDialog = (
          <Dialog
            open={this.state.banUserDialogOpen}
            onClose={this.onBanUserDialogClose}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
          >
            <DialogTitle id="alert-dialog-title">{`Ban ${user}`}</DialogTitle>
            <DialogContent>
              <DialogContentText id="alert-dialog-description">
                Do you want to prohibit <b>{user}</b> from posting new messages?
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={this.onBanUserDialogConfirm} color="secondary">
                Ban User
              </Button>
              <Button
                autoFocus
                onClick={this.onBanUserDialogClose}
                color="primary"
              >
                Cancel
              </Button>
            </DialogActions>
          </Dialog>
        );
      }
    }

    let newMessage;
    if (this.state.userAuthenticated) {
      const zeroBalance = !this.state.payerBalance;
      newMessage = (
        <div className={classes.newmessage}>
          <InputBase
            disabled={zeroBalance}
            placeholder={
              zeroBalance ? 'First add funds →' : 'Say something nice…'
            }
            value={this.state.newMessage}
            classes={{
              root: classes.inputRoot,
              input: classes.inputInput,
            }}
            onKeyDown={this.onInputKeyDown}
            onChange={this.onInputChange}
          />
        </div>
      );
    } else {
      newMessage = (
        <React.Fragment>
          <div className={classes.login}>
            <Button
              disabled={this.state.loginMethod === 'none'}
              variant="contained"
              color="default"
              onClick={this.onLogin}
            >
              Login to start posting
            </Button>
          </div>
          <div className={classes.grow} />
        </React.Fragment>
      );
    }

    return (
      <div className={classes.root}>
        <AppBar position="static">
          <Toolbar>
            <Button
              variant="contained"
              disabled={!this.blockExplorerUrl}
              href={this.blockExplorerTransactionsByProgramUrl()}
              className={classes.menuButton}
              color="secondary"
              aria-label="Block explorer"
            >
              <ExploreIcon />
            </Button>
            <Badge color="secondary" badgeContent={this.state.messages.length}>
              <Typography
                className={classes.title}
                variant="h6"
                color="inherit"
                noWrap
              >
                Message Feed
              </Typography>
            </Badge>
            {newMessage}
            {this.renderBalanceButton()}
            {this.state.idle ? <PauseIcon /> : ''}
            {this.busy() ? (
              <CircularProgress className={classes.progress} color="inherit" />
            ) : (
              ''
            )}
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
                href={this.blockExplorerLatestTransactionUrl()}
              >
                Transaction Details
              </Button>
            ) : (
              ''
            )
          }
        />
        {banUserDialog}
      </div>
    );
  }

  async postMessage(newMessage: string, userToBan = null) {
    if (newMessage.length === 0) {
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
    const {messages} = this.state;
    try {
      if (await userBanned(this.connection, this.userAccount.publicKey)) {
        this.setState({
          snackMessage: 'You are banned',
          transactionSignature: null,
        });
        return;
      }

      const transactionSignature = await postMessage(
        this.connection,
        this.payerAccount,
        this.userAccount,
        newMessage,
        messages[messages.length - 1].publicKey,
        userToBan,
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
    } finally {
      this.setState({busyPosting: false});
    }
  }

  onInputKeyDown = e => {
    if (e.keyCode !== 13) {
      return;
    }
    this.postMessage(this.state.newMessage);
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

  onLogin = async () => {
    switch (this.state.loginMethod) {
      case 'google':
        throw new Error(
          `TODO unimplemented login method: ${this.state.loginMethod}`,
        );
      case 'local': {
        const credentials = {id: new Account().publicKey.toString()};
        this.userAccount = await userLogin(
          this.connection,
          this.programId,
          this.loginUrl,
          credentials,
        );
        this.setState({userAuthenticated: true});
        break;
      }
      default:
        throw new Error(`Unsupported login method: ${this.state.loginMethod}`);
    }

    try {
      console.log('Saved user account:', this.userAccount.publicKey.toString());
      await localforage.setItem('programId', this.programId.toString());
      await localforage.setItem('userAccount', this.userAccount.secretKey);
    } catch (err) {
      console.log(`Unable to store user account in localforage: ${err}`);
    }
  };

  onBanUser = async message => {
    try {
      const banUserAlreadyBanned = await userBanned(
        this.connection,
        message.from,
      );
      this.setState({
        banUserDialogOpen: true,
        banUserAlreadyBanned,
        banUserMessage: message,
      });
    } catch (err) {
      console.error(err);
    }
  };

  onBanUserDialogClose = () => {
    this.setState({
      banUserDialogOpen: false,
      banUserMessage: null,
    });
  };

  onBanUserDialogConfirm = () => {
    this.onBanUserDialogClose();
    this.postMessage(
      `${this.state.banUserMessage.name} has been banned`,
      this.state.banUserMessage.from,
    );
  };

  blockExplorerTransactionsByProgramUrl = (): string | null => {
    if (!this.blockExplorerUrl) return;
    return `${this.blockExplorerUrl}/txns-by-prgid/${this.programId}`;
  };

  blockExplorerLatestTransactionUrl = () => {
    if (!this.blockExplorerUrl) return;
    if (this.state.transactionSignature === null) return;
    return `${this.blockExplorerUrl}/txns-by-prgid/${this.programId}`;
  };
}
App.propTypes = {
  classes: PropTypes.object.isRequired,
};

const StyledApp = withStyles(styles)(App);
ReactDOM.render(<StyledApp />, document.getElementById('app'));
module.hot.accept();
