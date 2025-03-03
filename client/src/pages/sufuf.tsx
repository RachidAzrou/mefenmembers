import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, User, ChevronLeft, House } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSocket } from "@/hooks/use-socket";
import { Route, Switch, useLocation } from "wouter";
import { FaPray } from "react-icons/fa";
import { PiUsersThree } from "react-icons/pi";

// Hadieth Component
const HadiethCard = () => (
  <Card className="bg-gradient-to-br from-[#963E56]/5 to-transparent border border-[#963E56]/10">
    <CardContent className="p-6 sm:p-8">
      <blockquote className="space-y-4">
        <p className="text-lg text-[#963E56] leading-relaxed font-medium italic">
          "Houd de rijen recht, want het recht houden van de rijen is deel van het perfect verrichten van het gebed."
        </p>
        <footer className="text-sm text-[#963E56]/80">
          — Overgeleverd door Bukhari & Muslim
        </footer>
      </blockquote>
    </CardContent>
  </Card>
);

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
    'first-floor': { id: 'first-floor', title: 'Moskee +1', status: 'grey' },
    'beneden': { id: 'beneden', title: 'Moskee +0', status: 'grey' },
    'garage': { id: 'garage', title: 'Garage', status: 'grey' }
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
    <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto">
      {Object.values(rooms).map((room) => (
        <Card
          key={room.id}
          className="overflow-hidden bg-white hover:shadow-lg transition-all duration-300"
        >
          <CardHeader className="p-6 pb-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-3 text-lg font-semibold text-[#963E56]">
              <House className="h-5 w-5" />
              {room.title}
            </CardTitle>
            <div className={`
              relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500
              ${room.status === 'green' ? 'bg-green-500 animate-pulse shadow-lg shadow-green-500/50' :
                room.status === 'red' ? 'bg-red-500 animate-pulse shadow-lg shadow-red-500/50' :
                'bg-gray-300'
              }
            `}>
              {room.status === 'green' && <Check className="w-6 h-6 text-white" />}
              {room.status === 'red' && <X className="w-6 h-6 text-white" />}
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-2">
            <div className="mt-4 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
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

// Component voor Vrijwilliger View
const VolunteerView = () => {
  const [, setLocation] = useLocation();

  return (
    <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto">
      {[
        { title: 'Moskee +1', path: '/sufuf/boven', icon: House },
        { title: 'Moskee +0', path: '/sufuf/beneden', icon: House },
        { title: 'Garage', path: '/sufuf/garage', icon: House }
      ].map((room) => (
        <Card
          key={room.title}
          className="overflow-hidden bg-white hover:shadow-lg transition-all duration-300"
        >
          <Button
            variant="ghost"
            className="w-full h-full p-6 text-lg font-medium text-[#963E56] hover:bg-[#963E56]/5 flex items-center justify-center gap-3"
            onClick={() => setLocation(room.path)}
          >
            <room.icon className="h-5 w-5" />
            {room.title}
          </Button>
        </Card>
      ))}
    </div>
  );
};

// Room Status Toggle Component
const RoomStatusToggle = ({ roomId, title }: { roomId: string; title: string }) => {
  const { socket } = useSocket();
  const [, setLocation] = useLocation();
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
    <div className="max-w-2xl mx-auto px-4">
      <Card className="overflow-hidden bg-white">
        <CardHeader className="p-6 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-3 text-xl font-semibold text-[#963E56]">
            <House className="h-6 w-6" />
            {title}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 hover:bg-[#963E56]/5 border-[#963E56]/20"
            onClick={() => setLocation('/sufuf')}
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Terug</span>
          </Button>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-3">
                <Check className={`w-6 h-6 ${okChecked ? 'text-green-500' : 'text-gray-300'}`} />
                <span className="text-lg font-medium text-[#963E56]">OK</span>
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
            <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-3">
                <X className={`w-6 h-6 ${nokChecked ? 'text-red-500' : 'text-gray-300'}`} />
                <span className="text-lg font-medium text-[#963E56]">NOK</span>
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
        </CardContent>
      </Card>
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
          <div className="container mx-auto px-4 py-6 space-y-6">
            <div className="flex items-center gap-4">
              <PiUsersThree className="h-8 w-8 text-[#963E56]" />
              <h1 className="text-2xl md:text-3xl font-bold text-[#963E56]">
                Sufuf (Gebedsrijen)
              </h1>
            </div>
            <HadiethCard />
            <Card className="overflow-hidden bg-white">
              <CardContent className="p-6">
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <Card className="overflow-hidden bg-white hover:shadow-lg transition-all duration-300">
                    <Button
                      variant="ghost"
                      className="w-full h-full p-6 text-lg font-medium text-[#963E56] hover:bg-[#963E56]/5 flex items-center justify-center gap-3"
                      onClick={() => setView('imam')}
                    >
                      <FaPray className="h-5 w-5" />
                      Imam
                    </Button>
                  </Card>
                  <Card className="overflow-hidden bg-white hover:shadow-lg transition-all duration-300">
                    <Button
                      variant="ghost"
                      className="w-full h-full p-6 text-lg font-medium text-[#963E56] hover:bg-[#963E56]/5 flex items-center justify-center gap-3"
                      onClick={() => setView('volunteer')}
                    >
                      <User className="h-5 w-5" />
                      Vrijwilliger
                    </Button>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="container mx-auto px-4 py-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {view === 'imam' ? (
                  <FaPray className="h-8 w-8 text-[#963E56]" />
                ) : (
                  <User className="h-8 w-8 text-[#963E56]" />
                )}
                <h1 className="text-2xl md:text-3xl font-bold text-[#963E56]">
                  {view === 'imam' ? 'Imam Dashboard' : 'Vrijwilliger Dashboard'}
                </h1>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2 hover:bg-[#963E56]/5 border-[#963E56]/20"
                onClick={() => setView('select')}
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Terug</span>
              </Button>
            </div>
            <HadiethCard />
            {view === 'imam' ? <ImamView /> : <VolunteerView />}
          </div>
        )}
      </Route>
      <Route path="/sufuf/boven">
        <div className="container mx-auto px-4 py-6">
          <RoomStatusToggle roomId="first-floor" title="Moskee +1" />
        </div>
      </Route>
      <Route path="/sufuf/beneden">
        <div className="container mx-auto px-4 py-6">
          <RoomStatusToggle roomId="beneden" title="Moskee +0" />
        </div>
      </Route>
      <Route path="/sufuf/garage">
        <div className="container mx-auto px-4 py-6">
          <RoomStatusToggle roomId="garage" title="Garage" />
        </div>
      </Route>
    </Switch>
  );
}