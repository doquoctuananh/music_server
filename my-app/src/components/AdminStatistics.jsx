import { Row, Col, Card, Statistic, Spin, message } from 'antd';
import { UserOutlined, AudioOutlined, TeamOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { statisticsAPI } from '../services/api';

export default function AdminStatistics() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalSongs: 0,
    totalArtists: 0,
    totalAlbums: 0,
    createdToday: 0,
    listensToday: 0,
  });

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      // Fetch users statistics
      const usersResponse = await statisticsAPI.getUsers();
      let totalMembers = 0;
      let createdToday = 0;
      
      if (usersResponse.success) {
        totalMembers = usersResponse.data?.totalMembers || 0;
        createdToday = usersResponse.data?.createdToday || 0;
      }

      // Fetch artists statistics
      const artistsResponse = await statisticsAPI.getArtists();
      let totalArtists = 0;
      
      if (artistsResponse.success) {
        totalArtists = artistsResponse.data?.total || 0;
      }

      // Fetch songs statistics
      const songsResponse = await statisticsAPI.getSongs();
      let totalSongs = 0;
      
      if (songsResponse.success) {
        totalSongs = songsResponse.data?.totalSongs || 0;
      }

      // Fetch albums statistics
      const albumsResponse = await statisticsAPI.getAlbums();
      let totalAlbums = 0;
      
      if (albumsResponse.success) {
        totalAlbums = albumsResponse.data?.totalAlbums || 0;
      }

      // Fetch today's statistics (listens)
      const todayResponse = await statisticsAPI.getTodayStats();
      let listensToday = 0;
      
      if (todayResponse.success) {
        listensToday = todayResponse.data?.totalListens || 0;
      }

      setStats({
        totalMembers: totalMembers,
        totalSongs: totalSongs,
        totalArtists: totalArtists,
        totalAlbums: totalAlbums,
        createdToday: createdToday,
        listensToday: listensToday,
      });
    } catch (err) {
      message.error('Lỗi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Spin spinning={loading}>
    <div>
      <Card
        title="📊 Thống Kê Hệ Thống"
        style={{ marginBottom: '20px' }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Tổng Người Dùng Member"
                value={stats.totalMembers}
                prefix={<UserOutlined style={{ color: '#667eea' }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Bài Hát"
                value={stats.totalSongs}
                prefix={<AudioOutlined style={{ color: '#52c41a' }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Nghệ Sĩ"
                value={stats.totalArtists}
                prefix={<TeamOutlined style={{ color: '#faad14' }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Albums"
                value={stats.totalAlbums}
                prefix={<UnorderedListOutlined style={{ color: '#f5222d' }} />}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Người Dùng Được Tạo Hôm Nay">
            <Statistic value={stats.createdToday} suffix="người" valueStyle={{ color: '#667eea' }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Số Lượt Nghe Hôm Nay">
            <Statistic value={stats.listensToday} suffix="lần" valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
      </Row>
    </div>
    </Spin>
  );
}
