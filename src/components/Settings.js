import React, { useState, useEffect, useReducer } from 'react';
import { Button, FormControlLabel, Checkbox, Divider, TextField, Box, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import SaveIcon from '@material-ui/icons/Save';
const { ipcRenderer } = window.require("electron");

const useStyles = makeStyles((theme) => ({
    root: {
        flexGrow: 1,
        height: '73vh',
        '& .MuiTextField-root': {
            margin: theme.spacing(1),
            width: '25ch',
        }
    },
    button: {
        width: '100%'
    },
    section1: {
        margin: theme.spacing(0, 0, 2),
    },
    section2: {
        margin: theme.spacing(2, 0, 2),
    },
    section3: {
        margin: theme.spacing(2, 0, 2),
    },
    section4: {
        margin: theme.spacing(2, 0, 2),
    }
}));



export default function SettingsTab(props) {
    const classes = useStyles();

    const [state, setState] = React.useState({
        startup: false,
        popup: false,
        broker: "",
        username: "",
        password: "",
        topic: "",
        path: "",
        profile: ""
    });

    const handleChange = (event) => {
        setState({ ...state, [event.target.name]: event.target.checked });
    };

    const handleSubmit = evt => {
        evt.preventDefault();

        var form = {startup:state.startup,
                    popup:state.popup,
                    broker:state.broker,
                    username:state.username,
                    password:state.password,
                    topic:state.topic,
                    path:state.path,
                    profile:state.profile,
                }

        console.log("Params Save: " + ipcRenderer.sendSync('save-params', form))
    };

    const handleInput = evt => {
        const name = evt.target.name;
        const newValue = evt.target.value;
        console.log(name + " , " + newValue);
        setState({ ...state, [name]: newValue });
    };

    useEffect( () => {
        var params = ipcRenderer.sendSync('get-params', 'get')

        setState({
            startup: params.startup,
            popup: params.popup,
            broker: params.broker,
            username: params.username,
            password: params.password,
            topic: params.topic,
            path: params.path,
            profile: params.profile

        });
                
    }, []);
    

    return (
        <form className={classes.root} noValidate autoComplete="off" onSubmit={handleSubmit}>
            <div className={classes.section1}>
                <Typography variant="h6" gutterBottom>
                    System
                </Typography>
                <FormControlLabel
                    control={<Checkbox checked={state.startup} disabled onChange={handleChange} name="startup" />}
                    label="Start on Windows startup"
                />
                <FormControlLabel
                    control={<Checkbox checked={state.popup} disabled onChange={handleChange} name="popup" />}
                    label="Show status bar pop-ups"
                />
            </div>
            <Divider />
            <div className={classes.section2}>
                <Typography variant="h6" gutterBottom>
                    MQTT
                </Typography>
                <TextField name="broker" label="Broker" value={state.broker} onChange={handleInput}/>
                <TextField name="username" label="Username" value={state.username} onChange={handleInput}/>
                <TextField name="password" label="Password" value={state.password} onChange={handleInput}/>
                <TextField name="topic" label="Root Topic" value={state.topic} onChange={handleInput}/>
            </div>
            <Divider />
            <div className={classes.section3}>
                <Typography variant="h6" gutterBottom>
                    GoXlr
                </Typography>
                <TextField name="path" label="Exe Path" value={state.path} onChange={handleInput}/>
                <TextField name="profile" label="Default Profile" value={state.profile} onChange={handleInput}/>
            </div>
            <Divider />
            <div className={classes.section4}>
                <Button variant="contained" color="primary" size="large" className={classes.button} startIcon={<SaveIcon />} type="Submit">
                    Save
                </Button>
            </div>
        </form>
    );
}

