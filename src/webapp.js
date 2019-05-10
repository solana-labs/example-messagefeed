import React from 'react';
import ReactDOM from 'react-dom';
import IdleTimer from 'react-idle-timer';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import AppBar from '@material-ui/core/AppBar';
import {withStyles} from '@material-ui/core/styles';
import {fade} from '@material-ui/core/styles/colorManipulator';
import PropTypes from 'prop-types';
import InputBase from '@material-ui/core/InputBase';
import Toolbar from '@material-ui/core/Toolbar';
import CircularProgress from '@material-ui/core/CircularProgress';
import Snackbar from '@material-ui/core/Snackbar';

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
      width: '60%',
    },
  },
  inputRoot: {
    color: 'inherit',
    width: '100%',
  },
  inputInput: {
    paddingTop: theme.spacing.unit,
    paddingRight: theme.spacing.unit,
    paddingBottom: theme.spacing.unit,
    paddingLeft: theme.spacing.unit * 2,
    transition: theme.transitions.create('width'),
    width: '100%',
    [theme.breakpoints.up('md')]: {
      width: 200,
    },
  },
});

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      busy: false,
      snackMessage: '',
      newMessage: '',
    };
  }
  render() {
    const {classes} = this.props;

    const messages = [];
    for (let i = 0; i < 25; i++) {
      messages.push(
        <div key={i}>
          <br />
          <Paper className={classes.message}>
            <Typography>message {i}</Typography>
          </Paper>
        </div>,
      );
    }

    return (
      <div className={classes.root}>
        <AppBar position="static">
          <Toolbar>
            <Typography
              className={classes.title}
              variant="h6"
              color="inherit"
              noWrap
            >
              Message Feed
            </Typography>
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
            <div className={classes.grow} />
            {this.state.busy ? (
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
          autoHideDuration={4000}
          onClose={this.onSnackClose}
          ContentProps={{
            'aria-describedby': 'message-id',
          }}
          message={<span id="message-id">{this.state.snackMessage}</span>}
        />
      </div>
    );
  }

  onInputKeyDown = e => {
    if (e.keyCode == 13) {
      if (this.state.busy) {
        this.setState({
          snackMessage: 'Unable to post message, please retry when not busy',
        });
      } else {
        this.setState({
          snackMessage: 'Message posted',
          newMessage: '',
          busy: true,
        });
      }
    }
  };

  onInputChange = e => {
    this.setState({newMessage: e.target.value});
  };

  onSnackClose = () => {
    this.setState({snackMessage: ''});
  };

  onActive = () => {
    console.log('user is active');
  };

  onIdle = () => {
    console.log('user is idle');
  };
}
App.propTypes = {
  classes: PropTypes.object.isRequired,
};

const StyledApp = withStyles(styles)(App);
ReactDOM.render(<StyledApp />, document.getElementById('app'));
module.hot.accept();
