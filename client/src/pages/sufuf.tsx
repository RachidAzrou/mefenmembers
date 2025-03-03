import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Grid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSocket } from "@/hooks/use-socket";
import { Route, Switch, useLocation } from "wouter";

// Room type definitie
type Room = {
  id: string;
  title: string;
  status: 'green' | 'red' | 'grey';
};

// Component voor Imam View
const ImamView = () => {
  const { socket } = useSocket();
  const [rooms, setRooms] = useState<Record<string, Room>>({
    'first-floor': { id: 'first-floor', title: 'Boven', status: 'grey' },
    'beneden': { id: 'beneden', title: 'Beneden', status: 'grey' },
    'garage': { id: 'garage', title: 'Garage', status: 'grey' },
    'vrouwen': { id: 'vrouwen', title: 'Vrouwen', status: 'grey' }
  });

  React.useEffect(() => {
    if (!socket) return;

    socket.on('initialStatus', (data: any) => {
      const updatedRooms = { ...rooms };
      Object.entries(data).forEach(([key, value]) => {
        if (updatedRooms[key]) {
          updatedRooms[key].status = value as 'green' | 'red' | 'grey';
        }
      });
      setRooms(updatedRooms);
    });

    socket.on('statusUpdated', (data: { room: string; status: 'green' | 'red' | 'grey' }) => {
      setRooms(prev => ({
        ...prev,
        [data.room]: { ...prev[data.room], status: data.status }
      }));
    });

    return () => {
      socket.off('initialStatus');
      socket.off('statusUpdated');
    };
  }, [socket]);

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
      {Object.values(rooms).map((room) => (
        <Card key={room.id} className="relative overflow-hidden hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#963E56]">{room.title}</h3>
              <div className={`h-4 w-4 rounded-full transition-all duration-300 ${
                room.status === 'green' ? 'bg-green-500 animate-pulse' :
                room.status === 'red' ? 'bg-red-500 animate-pulse' :
                'bg-gray-300'
              }`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Room Status Toggle Component
const RoomStatusToggle = ({ roomId, title }: { roomId: string; title: string }) => {
  const { socket } = useSocket();
  const [location, setLocation] = useLocation();
  const [okChecked, setOkChecked] = useState(false);
  const [nokChecked, setNokChecked] = useState(false);

  React.useEffect(() => {
    if (!socket) return;

    socket.on('initialStatus', (data: any) => {
      if (data[roomId] === 'green') {
        setOkChecked(true);
        setNokChecked(false);
      } else if (data[roomId] === 'red') {
        setOkChecked(false);
        setNokChecked(true);
      } else {
        setOkChecked(false);
        setNokChecked(false);
      }
    });
  }, [socket, roomId]);

  const handleOkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!socket) return;
    if (e.target.checked) {
      setNokChecked(false);
      socket.emit('updateStatus', { room: roomId, status: 'OK' });
    } else if (!nokChecked) {
      socket.emit('updateStatus', { room: roomId, status: 'OFF' });
    }
    setOkChecked(e.target.checked);
  };

  const handleNokChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!socket) return;
    if (e.target.checked) {
      setOkChecked(false);
      socket.emit('updateStatus', { room: roomId, status: 'NOK' });
    } else if (!okChecked) {
      socket.emit('updateStatus', { room: roomId, status: 'OFF' });
    }
    setNokChecked(e.target.checked);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Grid className="h-6 w-6 sm:h-8 sm:w-8 text-[#963E56]" />
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#963E56]">
            {title}
          </h1>
          <Button
            variant="ghost"
            className="ml-auto hover:bg-[#963E56]/10"
            onClick={() => setLocation('/sufuf')}
          >
            Terug
          </Button>
        </div>
        <div className="flex flex-col items-center gap-6 mt-8">
          <div className="w-full max-w-md space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <label className="text-sm font-medium">OK</label>
              <label className="relative inline-block w-12 h-6">
                <input
                  type="checkbox"
                  className="opacity-0 w-0 h-0"
                  checked={okChecked}
                  onChange={handleOkChange}
                />
                <span className={`absolute cursor-pointer inset-0 rounded-full transition-colors ${
                  okChecked ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              </label>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <label className="text-sm font-medium">NOK</label>
              <label className="relative inline-block w-12 h-6">
                <input
                  type="checkbox"
                  className="opacity-0 w-0 h-0"
                  checked={nokChecked}
                  onChange={handleNokChange}
                />
                <span className={`absolute cursor-pointer inset-0 rounded-full transition-colors ${
                  nokChecked ? 'bg-red-500' : 'bg-gray-200'
                }`} />
              </label>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Component voor Vrijwilliger View
const VolunteerView = () => {
  const { socket } = useSocket();
  const [loggedIn, setLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [, setLocation] = useLocation();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'sufuf2020') {
      setLoggedIn(true);
      sessionStorage.setItem('loggedIn', 'true');
    }
  };

  if (!loggedIn) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold mb-4 text-[#963E56]">Login</h2>
              <Input
                type="password"
                placeholder="Wachtwoord"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-[#963E56]/20 focus:border-[#963E56]"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-[#963E56] hover:bg-[#963E56]/90"
            >
              Inloggen
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto">
      {[
        { title: 'Boven', path: '/sufuf/boven' },
        { title: 'Beneden', path: '/sufuf/beneden' },
        { title: 'Garage', path: '/sufuf/garage' },
        { title: 'Vrouwen', path: '/sufuf/vrouwen' }
      ].map((room) => (
        <Card 
          key={room.title}
          className="hover:shadow-lg transition-all duration-300"
        >
          <CardContent className="p-6">
            <Button
              variant="ghost"
              className="w-full h-full text-lg font-medium text-[#963E56] hover:bg-[#963E56]/10"
              onClick={() => setLocation(room.path)}
            >
              {room.title}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Hoofdcomponent
export default function SufufPage() {
  const [view, setView] = useState<'select' | 'imam' | 'volunteer'>('select');

  return (
    <Switch>
      <Route path="/sufuf">
        {view === 'select' ? (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <Grid className="h-6 w-6 sm:h-8 sm:w-8 text-[#963E56]" />
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#963E56]">
                Sufuf (Gebedsrijen)
              </h1>
            </div>
            <Card className="max-w-2xl mx-auto">
              <CardContent className="p-6">
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <Button
                    variant="outline"
                    className="p-6 h-auto text-lg font-medium text-[#963E56] hover:bg-[#963E56]/10 hover:text-[#963E56]"
                    onClick={() => setView('imam')}
                  >
                    Imam
                  </Button>
                  <Button
                    variant="outline"
                    className="p-6 h-auto text-lg font-medium text-[#963E56] hover:bg-[#963E56]/10 hover:text-[#963E56]"
                    onClick={() => setView('volunteer')}
                  >
                    Vrijwilliger
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <Grid className="h-6 w-6 sm:h-8 sm:w-8 text-[#963E56]" />
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#963E56]">
                {view === 'imam' ? 'Imam Dashboard' : 'Vrijwilliger Dashboard'}
              </h1>
              <Button
                variant="ghost"
                className="ml-auto hover:bg-[#963E56]/10"
                onClick={() => setView('select')}
              >
                Terug
              </Button>
            </div>
            {view === 'imam' ? <ImamView /> : <VolunteerView />}
          </div>
        )}
      </Route>
      <Route path="/sufuf/boven">
        <RoomStatusToggle roomId="first-floor" title="Boven" />
      </Route>
      <Route path="/sufuf/beneden">
        <RoomStatusToggle roomId="beneden" title="Beneden" />
      </Route>
      <Route path="/sufuf/garage">
        <RoomStatusToggle roomId="garage" title="Garage" />
      </Route>
      <Route path="/sufuf/vrouwen">
        <RoomStatusToggle roomId="vrouwen" title="Vrouwen" />
      </Route>
    </Switch>
  );
}