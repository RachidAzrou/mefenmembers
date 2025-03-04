import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { House, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSocket } from "@/hooks/use-socket";
import { FaPray } from "react-icons/fa";
import { PiUsersThree } from "react-icons/pi";

type Room = {
  id: string;
  title: string;
  status: 'green' | 'red' | 'grey';
};

const HadiethCard = () => (
  <Card className="bg-gradient-to-br from-[#963E56]/5 to-transparent border border-[#963E56]/10">
    <CardContent className="p-4">
      <blockquote className="space-y-2">
        <p className="text-base text-[#963E56] leading-relaxed font-medium italic">
          "Houd de rijen recht, want het recht houden van de rijen is deel van het perfect verrichten van het gebed."
        </p>
        <footer className="text-xs text-[#963E56]/80">
          — Overgeleverd door Bukhari & Muslim
        </footer>
      </blockquote>
    </CardContent>
  </Card>
);

export default function SufufPage() {
  const { socket, connected } = useSocket();
  const [rooms, setRooms] = useState<Record<string, Room>>({
    'beneden': { id: 'beneden', title: 'Moskee +0', status: 'grey' },
    'first-floor': { id: 'first-floor', title: 'Moskee +1', status: 'grey' },
    'garage': { id: 'garage', title: 'Garage', status: 'grey' }
  });
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [okChecked, setOkChecked] = useState(false);
  const [nokChecked, setNokChecked] = useState(false);
  const [isVolunteerSectionOpen, setIsVolunteerSectionOpen] = useState(true);

  useEffect(() => {
    if (!socket || !connected) return;

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received message:', data);

        if (data.type === 'initialStatus') {
          setRooms(prev => ({ ...prev, ...data.data }));
        } else if (data.type === 'statusUpdated') {
          setRooms(prev => ({
            ...prev,
            [data.data.room]: {
              ...prev[data.data.room],
              status: data.data.status
            }
          }));
        }
      } catch (error) {
        console.error('Error handling message:', error);
      }
    };
  }, [socket, connected]);

  useEffect(() => {
    if (!selectedRoom || !rooms[selectedRoom]) return;
    setOkChecked(rooms[selectedRoom].status === 'green');
    setNokChecked(rooms[selectedRoom].status === 'red');
  }, [selectedRoom, rooms]);

  const handleOkChange = () => {
    if (!socket || !connected || !selectedRoom) return;
    const newChecked = !okChecked;
    setOkChecked(newChecked);
    setNokChecked(false);

    const message = {
      type: 'updateStatus',
      room: selectedRoom,
      status: newChecked ? 'OK' : 'OFF'
    };
    console.log('Sending message:', message);
    socket.send(JSON.stringify(message));
  };

  const handleNokChange = () => {
    if (!socket || !connected || !selectedRoom) return;
    const newChecked = !nokChecked;
    setNokChecked(newChecked);
    setOkChecked(false);

    const message = {
      type: 'updateStatus',
      room: selectedRoom,
      status: newChecked ? 'NOK' : 'OFF'
    };
    console.log('Sending message:', message);
    socket.send(JSON.stringify(message));
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-4">
        <PiUsersThree className="h-8 w-8 text-[#963E56]" />
        <h1 className="text-2xl md:text-3xl font-bold text-[#963E56]">
          Sufuf (Gebedsrijen)
        </h1>
      </div>

      <HadiethCard />

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-[#963E56] flex items-center gap-2">
          <FaPray className="h-5 w-5" />
          Imam Dashboard
        </h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Object.values(rooms).map((room) => (
            <Card key={room.id} className="overflow-hidden">
              <CardHeader className="p-6 pb-4 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-3 text-lg font-semibold text-[#963E56]">
                  <House className="h-5 w-5" />
                  {room.title}
                </CardTitle>
                <div className={`
                  relative w-10 h-10 rounded-full flex items-center justify-center
                  ${room.status === 'green' ? 'bg-green-500' :
                    room.status === 'red' ? 'bg-red-500' :
                    'bg-gray-300'
                  }
                `}>
                  {room.status === 'green' && <div className="w-6 h-6 text-white">✓</div>}
                  {room.status === 'red' && <div className="w-6 h-6 text-white">✗</div>}
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-2">
                <div className="mt-4 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
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
      </div>

      <div className="space-y-4">
        <Button
          variant="ghost"
          className="w-full flex items-center justify-between p-2 text-xl font-semibold text-[#963E56] hover:bg-[#963E56]/5"
          onClick={() => setIsVolunteerSectionOpen(!isVolunteerSectionOpen)}
        >
          <div className="flex items-center gap-2">
            <span>Vrijwilliger Dashboard</span>
          </div>
          <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${isVolunteerSectionOpen ? 'transform rotate-180' : ''}`} />
        </Button>

        {isVolunteerSectionOpen && (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {Object.values(rooms).map((room) => (
              <Card
                key={room.id}
                className={`
                  overflow-hidden bg-white hover:shadow-lg transition-all duration-300 relative
                  ${selectedRoom === room.id ? 'ring-2 ring-[#963E56] ring-offset-2' : ''}
                `}
                onClick={() => setSelectedRoom(room.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <House className="h-5 w-5 text-[#963E56]" />
                      <span className="font-medium text-[#963E56]">{room.title}</span>
                    </div>
                  </div>
                  {selectedRoom === room.id && (
                    <div className="space-y-4">
                      <Button
                        variant="outline"
                        className={`w-full flex items-center justify-between p-4 ${
                          okChecked ? 'bg-green-50 border-green-200 text-green-700' : 'text-gray-500'
                        }`}
                        onClick={handleOkChange}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-medium">Rijen in orde</span>
                        </div>
                      </Button>

                      <Button
                        variant="outline"
                        className={`w-full flex items-center justify-between p-4 ${
                          nokChecked ? 'bg-red-50 border-red-200 text-red-700' : 'text-gray-500'
                        }`}
                        onClick={handleNokChange}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-medium">Rijen niet in orde</span>
                        </div>
                      </Button>

                      {(okChecked || nokChecked) && (
                        <div className={`mt-4 p-3 rounded-lg border ${
                          okChecked ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
                        }`}>
                          <p className={`text-sm ${okChecked ? 'text-green-700' : 'text-red-700'}`}>
                            Doorgegeven aan imam
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}