import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Grid, Check, X } from "lucide-react";
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
    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 max-w-5xl mx-auto">
      {Object.values(rooms).map((room) => (
        <Card
          key={room.id}
          className="relative overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-gradient-to-br from-white to-gray-50/50 border border-gray-200"
        >
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-[#963E56]">{room.title}</h3>
              <div className={`
                relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500
                ${room.status === 'green' ? 'bg-green-500 animate-pulse shadow-lg shadow-green-500/50' :
                  room.status === 'red' ? 'bg-red-500 animate-pulse shadow-lg shadow-red-500/50' :
                  'bg-gray-300'
                }
              `}>
                {room.status === 'green' && (
                  <Check className="w-8 h-8 text-white animate-fade-in" />
                )}
                {room.status === 'red' && (
                  <X className="w-8 h-8 text-white animate-fade-in" />
                )}
              </div>
            </div>
            <div className="mt-6 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  room.status === 'green' ? 'w-full bg-green-500' :
                  room.status === 'red' ? 'w-full bg-red-500' :
                  'w-0'
                }`}
              />
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
    <Card className="w-full max-w-2xl mx-auto bg-gradient-to-br from-white to-gray-50/50">
      <CardContent className="p-8">
        <div className="flex items-center gap-4 mb-8">
          <Grid className="h-8 w-8 text-[#963E56]" />
          <h1 className="text-2xl md:text-3xl font-bold text-[#963E56]">
            {title}
          </h1>
          <Button
            variant="outline"
            className="ml-auto hover:bg-[#963E56]/10 border-[#963E56]/20"
            onClick={() => setLocation('/sufuf')}
          >
            Terug
          </Button>
        </div>
        <div className="flex flex-col items-center gap-8 mt-8">
          <div className="w-full max-w-md space-y-6">
            <div className="flex items-center justify-between p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-3">
                <Check className={`w-6 h-6 ${okChecked ? 'text-green-500' : 'text-gray-300'}`} />
                <label className="text-lg font-medium text-[#963E56]">OK</label>
              </div>
              <label className="relative inline-block w-16 h-8">
                <input
                  type="checkbox"
                  className="opacity-0 w-0 h-0"
                  checked={okChecked}
                  onChange={handleOkChange}
                />
                <span className={`
                  absolute cursor-pointer inset-0 rounded-full transition-all duration-300
                  ${okChecked ? 'bg-green-500 shadow-lg shadow-green-500/50' : 'bg-gray-200'}
                `} />
                <span className={`
                  absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-300
                  ${okChecked ? 'transform translate-x-8' : ''}
                `} />
              </label>
            </div>
            <div className="flex items-center justify-between p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-3">
                <X className={`w-6 h-6 ${nokChecked ? 'text-red-500' : 'text-gray-300'}`} />
                <label className="text-lg font-medium text-[#963E56]">NOK</label>
              </div>
              <label className="relative inline-block w-16 h-8">
                <input
                  type="checkbox"
                  className="opacity-0 w-0 h-0"
                  checked={nokChecked}
                  onChange={handleNokChange}
                />
                <span className={`
                  absolute cursor-pointer inset-0 rounded-full transition-all duration-300
                  ${nokChecked ? 'bg-red-500 shadow-lg shadow-red-500/50' : 'bg-gray-200'}
                `} />
                <span className={`
                  absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-300
                  ${nokChecked ? 'transform translate-x-8' : ''}
                `} />
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
      <Card className="max-w-md mx-auto bg-gradient-to-br from-white to-gray-50/50">
        <CardContent className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-6 text-[#963E56]">Login</h2>
              <Input
                type="password"
                placeholder="Wachtwoord"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-[#963E56]/20 focus:border-[#963E56] text-lg py-6"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-[#963E56] hover:bg-[#963E56]/90 text-lg py-6"
            >
              Inloggen
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto">
      {[
        { title: 'Boven', path: '/sufuf/boven' },
        { title: 'Beneden', path: '/sufuf/beneden' },
        { title: 'Garage', path: '/sufuf/garage' },
        { title: 'Vrouwen', path: '/sufuf/vrouwen' }
      ].map((room) => (
        <Card
          key={room.title}
          className="hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-gradient-to-br from-white to-gray-50/50 border border-gray-200"
        >
          <CardContent className="p-8">
            <Button
              variant="ghost"
              className="w-full h-full text-xl font-medium text-[#963E56] hover:bg-[#963E56]/10 py-8"
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
          <div className="space-y-8">
            <div className="flex items-center gap-4 mb-8">
              <Grid className="h-8 w-8 text-[#963E56]" />
              <h1 className="text-2xl md:text-3xl font-bold text-[#963E56]">
                Sufuf (Gebedsrijen)
              </h1>
            </div>
            <Card className="max-w-3xl mx-auto bg-gradient-to-br from-white to-gray-50/50">
              <CardContent className="p-8">
                <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">
                  <Card className="hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-200">
                    <CardContent className="p-8">
                      <Button
                        variant="ghost"
                        className="w-full h-full text-xl font-medium text-[#963E56] hover:bg-[#963E56]/10 py-8"
                        onClick={() => setView('imam')}
                      >
                        Imam
                      </Button>
                    </CardContent>
                  </Card>
                  <Card className="hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-200">
                    <CardContent className="p-8">
                      <Button
                        variant="ghost"
                        className="w-full h-full text-xl font-medium text-[#963E56] hover:bg-[#963E56]/10 py-8"
                        onClick={() => setView('volunteer')}
                      >
                        Vrijwilliger
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex items-center gap-4 mb-8">
              <Grid className="h-8 w-8 text-[#963E56]" />
              <h1 className="text-2xl md:text-3xl font-bold text-[#963E56]">
                {view === 'imam' ? 'Imam Dashboard' : 'Vrijwilliger Dashboard'}
              </h1>
              <Button
                variant="outline"
                className="ml-auto hover:bg-[#963E56]/10 border-[#963E56]/20"
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