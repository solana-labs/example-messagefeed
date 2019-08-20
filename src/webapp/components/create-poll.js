import React from 'react';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import PropTypes from 'prop-types';
// import {withStyles} from '@material-ui/core/styles';

class CreatePollDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      open: false,
      header: '',
      optionA: '',
      optionB: '',
      timeout: 100,
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
    if (await this.props.onCreate(header, optionA, optionB, timeout)) {
      this.setState({
        header: '',
        optionA: '',
        optionB: '',
      });
    }
  }

  render() {
    return (
      <div>
        <Button
          variant="filled"
          color="primary"
          onClick={() => this.handleOpen()}
        >
          Open form dialog
        </Button>

        <Dialog
          open={this.state.open}
          onClose={() => this.handleClose()}
          aria-labelledby="form-dialog-title"
        >
          <DialogTitle id="form-dialog-title">Create Poll</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Ask a binary question and see what the community thinks!
            </DialogContentText>
            <TextField
              required
              id="standard-full-width"
              label="Poll Header"
              style={{margin: 8}}
              placeholder="Your question goes here"
              fullWidth
              margin="normal"
              value={this.state.header}
              onChange={e => this.setState({header: e.target.value})}
              InputLabelProps={{
                shrink: true,
              }}
            />
            <TextField
              required
              id="standard-full-width"
              label="Option A"
              style={{margin: 8}}
              fullWidth
              value={this.state.optionA}
              onChange={e => this.setState({optionA: e.target.value})}
              margin="normal"
            />
            <TextField
              required
              id="standard-full-width"
              label="Option B"
              style={{margin: 8}}
              fullWidth
              value={this.state.optionB}
              onChange={e => this.setState({optionB: e.target.value})}
              margin="normal"
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
      </div>
    );
  }
}

CreatePollDialog.propTypes = {
  onCreate: PropTypes.func.isRequired,
};

// export default withStyles(styles)(CreatePollDialog);
export default CreatePollDialog;
