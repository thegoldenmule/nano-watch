import './App.css';
import { Button, Col, Container, Form, InputGroup, Navbar, NavbarBrand, Row } from 'react-bootstrap';
import React, { useState } from 'react';
import { BellIcon, BellSlashIcon, CheckIcon, KebabHorizontalIcon, StopIcon } from '@primer/octicons-react';

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
  isError:          false,
  averageHashRate:  -1
});

const StatusBar = ({ miner, updateMiner }) => {
  const { address, alertHashRate, isPolling, isError, averageHashRate } = miner;

  return (
    <Form.Group>
      <InputGroup>
        <InputGroup.Prepend>
          <InputGroup.Text>
            { isPolling ? (isError ? <StopIcon /> : <CheckIcon />) : <KebabHorizontalIcon /> }
          </InputGroup.Text>
        </InputGroup.Prepend>

        <Button onClick={() => {
          updateMiner({ ...miner, isPolling: !isPolling })
        }}>
          { isPolling ? <BellIcon /> : <BellSlashIcon />}
        </Button>
        <InputGroup.Append>
          <InputGroup.Text>{averageHashRate} Mh/s</InputGroup.Text>
        </InputGroup.Append>
      </InputGroup>
    </Form.Group>
  );
};

const MinerStatus = ({ miner, updateMiner, removeMiner }) => {
  const { name, address, alertHashRate } = miner;

  return (
    <div style={{ padding: '10px', margin: '6px', backgroundColor: '#EEEEEE' }}>
      <Form>
        <Form.Group>
          <Button size='sm' variant='danger' onClick={() => removeMiner()}>Remove</Button>
        </Form.Group>
        <Form.Group>
          <Form.Control type='text' placeholder='Nickname' value={name} onChange={evt => updateMiner({ ...miner, name: evt.target.value })} />
        </Form.Group>
        <Form.Group>
          <Form.Control type='text' placeholder='Address' value={address} onChange={(evt) => {
            updateMiner({ ...miner, address: evt.target.value })
          }} />
        </Form.Group>
        <Form.Group>
          <InputGroup>
            <Form.Control type='number' placeholder='Minimum hash rate' value={alertHashRate} onChange={evt => updateMiner({ ...miner, alertHashRate: evt.target.value })} />
            <InputGroup.Append>
              <InputGroup.Text id="basic-addon2">Mh/s</InputGroup.Text>
            </InputGroup.Append>
          </InputGroup>
        </Form.Group>
        <StatusBar miner={miner} updateMiner={updateMiner} />
      </Form>
    </div>
  );
};

const Miners = ({ miners, setMiners }) => {
  const minerComponents = miners.map((miner, i) => <MinerStatus key={i} miner={miner}
      updateMiner={updated => {
        const newMiners = [...miners];
        newMiners[i] = updated;
        setMiners(newMiners);
      }}
      removeMiner={() => {
        const newMiners = [...miners];
        newMiners.splice(i, 1);
        setMiners(newMiners);
      }}
    />
  );

  useInterval(async () => {
    const results = await Promise.all(miners.map(({ address, averageHashRate, isPolling }) =>
      !isPolling
        ? Promise.resolve({ data: averageHashRate })
        : fetch(`https://api.nanopool.org/v1/eth/avghashratelimited/${address}/1`).then(res => res.json())));

    // update notifications
    for (const miner of miners) {
      const { isError, name, averageHashRate, alertHashRate } = miner;
      if (averageHashRate > -1 && averageHashRate < alertHashRate) {
        if (!isError) {
          miner.isError = true;

          await showNotification(`Miner '${name} is having trouble!`);
        }
      } else {
        miner.isError = false;
      }
    }

    setMiners(miners.map((m, i) => ({
      ...m,
      averageHashRate: results[i].data
    })))
  }, 10000);

  return (
    <Container>
      {minerComponents}
    </Container>
  )
}

function App() {
  const json = localStorage.getItem('miners') || '[]';
  const [miners, setMiners] = useState(JSON.parse(json));

  return (
    <div style={{ paddingTop: '20px' }}>
      <Container>
        <Navbar>
          <Navbar.Brand>Nanopool Watcher</Navbar.Brand>
          <Button onClick={async () => {
            setMiners(miners.concat(newMiner()));

            await Notification.requestPermission();
          }}>Add Miner</Button>
        </Navbar>
        <Miners miners={miners} setMiners={newMiners => {
          localStorage.setItem('miners', JSON.stringify(newMiners));

          setMiners(newMiners);
        }} />
      </Container>
    </div>
  );
}

export default App;
