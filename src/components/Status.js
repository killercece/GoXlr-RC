import React, { useState, useEffect } from 'react';
import { Paper } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
const { ipcRenderer } = window.require("electron");

const useStyles = makeStyles((theme) => ({
    root: {
        flexGrow: 1,
        height: '88vh',
        'white-space': 'pre-line'
    },
    paper: {
        width: '96%',
        height: '100%',
        padding: 5
      }
}));

const statusState = {
    logger: ""
  }

export default function StatusTab(props) {
    const classes = useStyles();

    const [logger, setLogger] = useState("");

    useEffect( () => {
        setLogger(ipcRenderer.sendSync('get-logger', 'get'));
        ipcRenderer.on('logger', (event, message) => {
            setLogger(ipcRenderer.sendSync('get-logger', 'get'));
        })
                
    }, [logger]);

    return (
        <div className={classes.root}>
            <Paper className={classes.paper} elevation={3}>
                <div className="container">
                    {logger}
                </div>
            </Paper>
        </div>
    );
}

