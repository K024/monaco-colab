using System.Collections.Generic;
using System.Threading.Tasks;

namespace monaco_colab
{
    public interface IColabClient
    {
        Task UserDisconnected(string UserId);

        Task Message(string from, string type, string message);
    }
}