import React from 'react';
import Fab from '@material-ui/core/Fab';
import AddIcon from '@material-ui/icons/Add';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import PropTypes from 'prop-types';
import Zoom from '@material-ui/core/Zoom';
import {withStyles} from '@material-ui/core/styles';

const styles = theme => ({
  fab: {
    position: 'fixed',
    zIndex: 100,
    bottom: theme.spacing.unit * 2,
    right: theme.spacing.unit * 2,
  },
  field: {
    marginBottom: theme.spacing.unit * 2,
  },
});

class CreatePollDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      open: false,
      header: '',
      optionA: '',
      optionB: '',
      timeout: 3600,
    };
  }

  handleOpen() {
    this.setState({open: true});
  }

  handleClose() {
    this.setState({open: false});
  }

  async submit() {
    const {header, optionA, optionB, timeout} = this.state;
    this.handleClose();
    if (
      await this.props.onCreate(header, optionA, optionB, parseInt(timeout))
    ) {
      this.setState({
        header: '',
        optionA: '',
        optionB: '',
      });
    }
  }

  render() {
    const {classes} = this.props;
    return (
      <React.Fragment>
        <Zoom in={true} unmountOnExit>
          <Fab
            color="secondary"
            className={classes.fab}
            disabled={this.props.disabled}
            onClick={() => this.handleOpen()}
          >
            <AddIcon />
          </Fab>
        </Zoom>
        <Dialog
          open={this.state.open}
          onClose={() => this.handleClose()}
          aria-labelledby="form-dialog-title"
        >
          <DialogTitle id="form-dialog-title">Create Poll</DialogTitle>
          <DialogContent>
            <TextField
              required
              label="Poll Header"
              className={classes.field}
              fullWidth
              value={this.state.header}
              onChange={e => this.setState({header: e.target.value})}
            />
            <TextField
              required
              label="Option A"
              className={classes.field}
              fullWidth
              value={this.state.optionA}
              onChange={e => this.setState({optionA: e.target.value})}
            />
            <TextField
              required
              label="Option B"
              className={classes.field}
              fullWidth
              value={this.state.optionB}
              onChange={e => this.setState({optionB: e.target.value})}
            />
            <TextField
              required
              label="Slot Timeout"
              placeholder="How many slots would you like to run your poll for?"
              className={classes.field}
              type="number"
              fullWidth
              value={this.state.timeout}
              onChange={e => this.setState({timeout: e.target.value})}
              helperText="Cluster processes approx. 3600 slots per hour"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => this.handleClose()} color="primary">
              Cancel
            </Button>
            <Button onClick={() => this.submit()} color="primary">
              Submit
            </Button>
          </DialogActions>
        </Dialog>
      </React.Fragment>
    );
  }
}

CreatePollDialog.propTypes = {
  classes: PropTypes.object.isRequired,
  disabled: PropTypes.bool.isRequired,
  onCreate: PropTypes.func.isRequired,
};

export default withStyles(styles)(CreatePollDialog);
