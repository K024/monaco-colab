using Microsoft.AspNetCore.SignalR;

namespace monaco_colab
{
    public class UserIdProvider : IUserIdProvider
    {
        public string GetUserId(HubConnectionContext connection)
        {
            return connection.ConnectionId;
        }
    }
}