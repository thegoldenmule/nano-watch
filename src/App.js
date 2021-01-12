import './App.css';
import { Button, Container, Form, InputGroup } from 'react-bootstrap';
import React, { useState } from 'react';
import { BellIcon, BellSlashIcon } from '@primer/octicons-react';

const showNotification = async (message) => {
  if (Notification.permission === "granted") {
    // If it's okay let's create a notification
    new Notification(message);
  }
  // Otherwise, we need to ask the user for permission
  else if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission()

    // If the user accepts, let's create a notification
    if (permission === "granted") {
      new Notification(message);
    }
  }
}

function useInterval(callback, delay) {
  const intervalId = React.useRef(null);
  const savedCallback = React.useRef(callback);
  React.useEffect(() => {
    savedCallback.current = callback;
  });
  React.useEffect(() => {
    const tick = () => savedCallback.current();
    if (typeof delay === 'number') {
      intervalId.current = window.setInterval(tick, delay);
      return () => window.clearInterval(intervalId.current);
    }
  }, [delay]);
  return intervalId.current;
}

const newMiner = () => ({
  name:             'New Miner',
  address:          '',
  alertHashRate:    350,
  isPolling:        false,
  averageHashRate:  -1
});

const StatusBar = ({ miner, updateMiner }) => {
  const { address, alertHashRate, isPolling, averageHashRate } = miner;

  return (
    <div>
      <Button onClick={() => {
        updateMiner({ ...miner, isPolling: !isPolling })
      }}>
        { isPolling ? <BellIcon /> : <BellSlashIcon />}
      </Button>
      <p>{averageHashRate}</p>
    </div>
  );
};

const MinerStatus = ({ miner, updateMiner }) => {
  const { name, address, alertHashRate } = miner;

  return (
    <Form>
      <Form.Group>
        <Form.Control type='text' placeholder='Nickname' value={name} onChange={val => updateMiner({ ...miner, name: val })} />
      </Form.Group>
      <Form.Group>
        <Form.Control type='text' placeholder='Address' value={address} onChange={(evt) => {
          updateMiner({ ...miner, address: evt.target.value })
        }} />
      </Form.Group>
      <Form.Group>
        <InputGroup>
          <Form.Control type='number' placeholder='Minimum hash rate' value={alertHashRate} onChange={val => updateMiner({ ...miner, alertHashRate: val })} />
          <InputGroup.Append>
            <InputGroup.Text id="basic-addon2">Mh/s</InputGroup.Text>
          </InputGroup.Append>
        </InputGroup>
      </Form.Group>
      <Form.Group>
        <StatusBar miner={miner} updateMiner={updateMiner} />
      </Form.Group>
    </Form>
  );
};

const Miners = () => {
  const [miners, setMiners] = useState([]);
  const minerComponents = miners.map((miner, i) => <MinerStatus key={i} miner={miner} updateMiner={updated => {
    const newMiners = [...miners];
    newMiners[i] = updated;
    setMiners(newMiners);
  }} />);

  useInterval(async () => {
    const results = await Promise.all(miners.map(({ address, averageHashRate, isPolling }) =>
      !isPolling
        ? Promise.resolve({ data: averageHashRate })
        : fetch(`https://api.nanopool.org/v1/eth/avghashratelimited/${address}/1`).then(res => res.json())));

    setMiners(miners.map((m, i) => ({
      ...m,
      averageHashRate: results[i].data
    })))

    // update notifications
    for (const { name, averageHashRate, alertHashRate } of miners) {
      if (averageHashRate > -1 && averageHashRate < alertHashRate) {
        await showNotification(`Miner '${name} is having trouble!`);
      }
    }
  }, 1000);

  return (
    <div>
      <Button onClick={() => setMiners(miners.concat(newMiner()))}>New Miner</Button>
      <Container>
        {minerComponents}
      </Container>
    </div>
  )
}

function App() {
  return (
    <div>
      <Container>
        <Miners />
      </Container>
    </div>
  );
}

export default App;
