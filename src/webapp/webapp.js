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
import {withStyles} from '@material-ui/core/styles';

import Api from './api';
import MessageList from './message-list';
import Toolbar from './toolbar';

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
      idle: true,
      loginMethod: 'none',
      messages: [],
      snackMessage: '',
      transactionSignature: null,
      userAccount: null,
      payerBalance: 0,
      programId: null,
      walletUrl: '',
    };

    this.api = new Api();
  }

  componentDidMount() {
    this.onActive();
  }

  componentWillUnmount() {
    this.onIdle();
  }

  onActive() {
    this.setState({idle: false});

    this.api.subscribeConfig(config => {
      this.setState(config);
    });

    this.api.subscribeBalance(payerBalance => {
      this.setState({payerBalance});
    });

    this.api.subscribeMessages(messages => {
      this.setState({
        busyLoading: false,
        messages,
      });
    });
  }

  onIdle() {
    this.setState({idle: true});
    this.api.unsubscribe();
  }

  async onLogin() {
    this.setState({busyLoggingIn: true});
    const newState = {busyLoggingIn: false};
    try {
      const userAccount = await this.api.login(this.state.loginMethod);
      Object.assign(newState, {userAccount});
    } catch (err) {
      console.error(err);
    } finally {
      this.setState(newState);
    }
  }

  requestFunds() {
    this.api.requestFunds(res => this.setState(res));
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
          userAuthenticated={!!this.state.userAccount}
          walletDisabled={!this.state.walletUrl}
        />
        <IdleTimer
          element={document}
          onActive={() => this.onActive()}
          onIdle={() => this.onIdle()}
          debounce={250}
          timeout={1000 * 60 * 15}
        />
        <MessageList
          messages={this.state.messages}
          onBanUser={msg => this.onBanUser(msg)}
          payerBalance={this.state.payerBalance}
          userAccount={this.state.userAccount}
          userAuthenticated={!!this.state.userAccount}
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

    const {messages, userAccount} = this.state;
    const lastMessageKey = messages[messages.length - 1].publicKey;
    const {snackMessage, transactionSignature} = await this.api.postMessage(
      userAccount,
      newMessage,
      lastMessageKey,
      userToBan,
    );

    this.setState({
      busyPosting: false,
      snackMessage,
      transactionSignature,
    });

    return true;
  }

  onSnackClose = () => {
    this.setState({
      snackMessage: '',
      transactionSignature: null,
    });
  };

  onBanUser = async message => {
    try {
      const banUserAlreadyBanned = await this.api.isUserBanned(message.from);
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
    if (!this.state.explorerUrl) return;
    if (!this.state.programId) return;
    return `${this.state.explorerUrl}/txns-by-prgid/${this.state.programId}`;
  };

  blockExplorerLatestTransactionUrl = () => {
    if (!this.state.explorerUrl) return;
    if (!this.state.programId) return;
    if (this.state.transactionSignature === null) return;
    return `${this.state.explorerUrl}/txns-by-prgid/${this.state.programId}`;
  };
}
App.propTypes = {
  classes: PropTypes.object.isRequired,
};

const StyledApp = withStyles(styles)(App);
ReactDOM.render(<StyledApp />, document.getElementById('app'));
module.hot.accept();
