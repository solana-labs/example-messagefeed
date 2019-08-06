import React from 'react';
import IconButton from '@material-ui/core/IconButton';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import Paper from '@material-ui/core/Paper';
import PropTypes from 'prop-types';
import ReportIcon from '@material-ui/icons/Report';
import {withStyles} from '@material-ui/core/styles';
import escapeHtml from 'escape-html';

const styles = theme => ({
  message: {
    ...theme.mixins.gutters(),
    paddingTop: theme.spacing.unit * 2,
    paddingBottom: theme.spacing.unit * 2,
    position: 'relative',
    width: '100%',
  },
});

class MessageList extends React.Component {
  render() {
    const {messages, userAccount} = this.props;
    const renderMessages = messages
      .map((message, index) => {
        const fromUser =
          userAccount && message.from.equals(userAccount.publicKey);
        return this.renderMessage(message, index, fromUser);
      })
      .reverse();

    return <List>{renderMessages}</List>;
  }

  renderMessage(message, index, fromUser) {
    const {classes, userAuthenticated, payerBalance} = this.props;
    const showReportAction = userAuthenticated && !fromUser && index !== 0;
    const reportDisabled = payerBalance === 0;
    const reportAction = showReportAction ? (
      <ListItemSecondaryAction>
        <IconButton
          edge="end"
          aria-label="Report"
          onClick={() => this.onBanUser(message)}
          disabled={reportDisabled}
        >
          <ReportIcon />
        </IconButton>
      </ListItemSecondaryAction>
    ) : null;

    const postedBy = 'Posted by ' + message.name + (fromUser ? ' (you)' : '');
    return (
      <ListItem key={index}>
        <Paper className={classes.message}>
          <ListItemText
            primary={escapeHtml(message.text)}
            secondary={postedBy}
          />
          {reportAction}
        </Paper>
      </ListItem>
    );
  }
}

MessageList.propTypes = {
  classes: PropTypes.object.isRequired,
  messages: PropTypes.array.isRequired,
  payerBalance: PropTypes.number.isRequired,
  userAccount: PropTypes.object,
  userAuthenticated: PropTypes.bool.isRequired,
};

export default withStyles(styles)(MessageList);
