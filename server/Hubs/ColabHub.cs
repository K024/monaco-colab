using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;

namespace monaco_colab
{
    public class ColabHub : Hub<IColabClient>
    {
        private static readonly ConcurrentDictionary<string, object?> ClientMap = new ConcurrentDictionary<string, object?>();

        public override Task OnConnectedAsync()
        {
            ClientMap.TryAdd(Context.UserIdentifier, null);
            return base.OnConnectedAsync();
        }
        public override Task OnDisconnectedAsync(Exception exception)
        {
            ClientMap.TryRemove(Context.UserIdentifier, out _);
            Clients.Others.UserDisconnected(Context.UserIdentifier);
            return base.OnDisconnectedAsync(exception);
        }

        public List<string> AllClients()
        {
            return ClientMap.Keys.ToList();
        }

        public Task BroadcastMessage(string type, string message)
        {
            return Clients.Others.Message(Context.ConnectionId, type, message);
        }

        public Task PrivateMessage(string target, string type, string message)
        {
            return Clients.Client(target).Message(Context.ConnectionId, type, message);
        }
    }
}