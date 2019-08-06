import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import IdleTimer from 'react-idle-timer';
import PropTypes from 'prop-types';
import React from 'react';
import ReactDOM from 'react-dom';
import Snackbar from '@material-ui/core/Snackbar';
import {Account, Connection, PublicKey} from '@solana/web3.js';
import {withStyles} from '@material-ui/core/styles';
import localforage from 'localforage';

import MessageList from './message-list';
import Toolbar from './toolbar';
import {
  getFirstMessage,
  postMessage,
  refreshMessageFeed,
  userBanned,
  userLogin,
} from '../message-feed';

const styles = () => ({
  root: {
    width: '100%',
  },
});

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      banUserAlreadyBanned: false,
      banUserDialogOpen: false,
      banUserMessage: null,
      busyLoading: true,
      busyLoggingIn: false,
      busyPosting: false,
      idle: false,
      messages: [],
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
  }

  componentDidMount() {
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

  render() {
    const {classes} = this.props;

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

    const {busyLoading, busyPosting, busyLoggingIn} = this.state;
    return (
      <div className={classes.root}>
        <Toolbar
          busy={busyLoading || busyPosting || busyLoggingIn}
          explorerUrl={this.blockExplorerTransactionsByProgramUrl()}
          idle={this.state.idle}
          loginDisabled={this.state.loginMethod === 'none'}
          messageCount={this.state.messages.length}
          onLogin={() => this.onLogin()}
          onPostMessage={msg => this.postMessage(msg)}
          onRequestFunds={() => this.requestFunds()}
          payerBalance={this.state.payerBalance}
          userAuthenticated={this.state.userAuthenticated}
          walletDisabled={!this.state.walletUrl}
        />
        <IdleTimer
          element={document}
          onActive={this.onActive}
          onIdle={this.onIdle}
          debounce={250}
          timeout={1000 * 60 * 15}
        />
        <MessageList
          messages={this.state.messages}
          payerBalance={this.state.payerBalance}
          userAccount={this.userAccount}
          userAuthenticated={this.state.userAuthenticated}
        />
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
      return false;
    }

    if (this.state.busyPosting) {
      this.setState({
        snackMessage: 'Unable to post message, please retry when not busy',
        transactionSignature: null,
      });
      return false;
    }
    this.setState({busyPosting: true});
    const {messages} = this.state;
    try {
      if (await userBanned(this.connection, this.userAccount.publicKey)) {
        this.setState({
          snackMessage: 'You are banned',
          transactionSignature: null,
        });
        return false;
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
      });
    } catch (err) {
      console.error(`Failed to post message: ${err}`);
      this.setState({
        snackMessage: 'An error occured when posting the message',
      });
      return false;
    } finally {
      this.setState({busyPosting: false});
    }
    return true;
  }

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
        let userAuthenticated = this.state.userAuthenticated;
        this.setState({busyLoggingIn: true});
        try {
          this.userAccount = await userLogin(
            this.connection,
            this.programId,
            this.loginUrl,
            credentials,
          );
          userAuthenticated = true;
        } finally {
          this.setState({busyLoggingIn: false, userAuthenticated});
        }
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
