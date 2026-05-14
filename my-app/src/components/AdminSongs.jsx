import { Table, Button, Space, Modal, Form, Input, Card, message, Spin, Pagination, Select, InputNumber, Upload, Row, Col } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, UploadOutlined, EyeOutlined, SearchOutlined, ClearOutlined } from '@ant-design/icons';
import { useState, useEffect, useRef } from 'react';
import { songAPI, albumAPI } from '../services/api';

export default function AdminSongs() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingSong, setViewingSong] = useState(null);
  const [viewingArtists, setViewingArtists] = useState([]);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [songs, setSongs] = useState([]);
  const [editingSong, setEditingSong] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [artists, setArtists] = useState([]);
  const [songFile, setSongFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [editSongFile, setEditSongFile] = useState(null);
  const [editImageFile, setEditImageFile] = useState(null);
  const [songFileList, setSongFileList] = useState([]);
  const [imageFileList, setImageFileList] = useState([]);
  const [editSongFileList, setEditSongFileList] = useState([]);
  const [editImageFileList, setEditImageFileList] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 6,
    total: 0,
  });
  const [artistNameMap, setArtistNameMap] = useState({});
  const [albumNameMap, setAlbumNameMap] = useState({});
  const [albums, setAlbums] = useState([]);
  const audioRef = useRef(null);

  useEffect(() => {
    fetchArtists();
    fetchAlbums();
    fetchSongs(pagination.current, pagination.pageSize, searchKeyword);
  }, []);

  const fetchArtists = async () => {
    try {
      const response = await songAPI.getArtistsForSelect();
      if (response.success) {
        setArtists(response.data?.artists || []);
      } else {
        message.error('Lỗi lấy danh sách nghệ sĩ');
      }
    } catch (err) {
      console.error('Fetch artists error:', err);
    }
  };

  const fetchAlbums = async () => {
    try {
      const response = await albumAPI.getAlbumsForSelect();
      console.log('Fetch albums response:', response);
      if (response.success) {
        let albumsArray = [];
        
        // Handle different response structures
        if (response.data?.albums && Array.isArray(response.data.albums)) {
          albumsArray = response.data.albums;
        } else if (Array.isArray(response.data)) {
          albumsArray = response.data;
        }
        
        console.log('Albums array:', albumsArray);
        setAlbums(albumsArray);
      } else {
        message.error('Lỗi lấy danh sách album');
      }
    } catch (err) {
      console.error('Fetch albums error:', err);
      message.error('Lỗi lấy danh sách album');
    }
  };

  const fetchSongs = async (page = 1, limit = 6, keyword = '') => {
    setDataLoading(true);
    try {
      let response;
      
      if (keyword.trim()) {
        response = await songAPI.searchSongs(keyword, page, limit);
      } else {
        response = await songAPI.getSongs(page, limit);
      }
      
      console.log('API Response:', response);
      
      if (response.success) {
        const songsArray = response.data?.songs && Array.isArray(response.data.songs)
          ? response.data.songs
          : [];
        console.log('Songs Array:', songsArray);
        
        setSongs(songsArray);
        setPagination({
          current: response.data?.pagination?.page || page,
          pageSize: response.data?.pagination?.limit || limit,
          total: response.data?.pagination?.total || 0,
        });

        // Fetch artist names for all unique artist IDs
        const uniqueArtistIds = new Set();
        const uniqueAlbumIds = new Set();

        // Songs may include `album` as a string id or an object { _id, name }
        songsArray.forEach(song => {
          if (song.artist && Array.isArray(song.artist)) {
            song.artist.forEach(id => uniqueArtistIds.add(id));
          }
          if (song.album) {
            if (typeof song.album === 'string') {
              uniqueAlbumIds.add(song.album);
            } else if (typeof song.album === 'object' && song.album._id) {
              uniqueAlbumIds.add(song.album._id);
            }
          }
        });

        if (uniqueArtistIds.size > 0) {
          const artistDetailsPromises = Array.from(uniqueArtistIds).map(id =>
            songAPI.getArtistDetail(id).catch(err => {
              console.error(`Error fetching artist ${id}:`, err);
              return { data: { _id: id, name: 'Unknown' } };
            })
          );
          
          const artistDetailsResults = await Promise.all(artistDetailsPromises);
          const newArtistMap = {};
          artistDetailsResults.forEach(result => {
            if (result.data) {
              newArtistMap[result.data._id] = result.data.name;
            }
          });
          setArtistNameMap(newArtistMap);
        }

        if (uniqueAlbumIds.size > 0) {
          const albumDetailsPromises = Array.from(uniqueAlbumIds).map(id =>
            albumAPI.getAlbumDetail(id).then(res => ({ id, res })).catch(err => {
              console.error(`Error fetching album ${id}:`, err);
              return { id, res: null };
            })
          );

          const albumDetailsResults = await Promise.all(albumDetailsPromises);
          const newAlbumMap = { ...albumNameMap };
          albumDetailsResults.forEach(({ id, res }) => {
            if (!res) {
              newAlbumMap[id] = 'Unknown';
              return;
            }

            // Album API might return different shapes: { data: { _id, name } } or { data: { album: { _id, name } } }
            let albumData = null;
            if (res.data) {
              if (res.data._id && res.data.name) {
                albumData = res.data;
              } else if (res.data.album && res.data.album._id) {
                albumData = res.data.album;
              } else if (Array.isArray(res.data) && res.data.length > 0) {
                // fallback to first element
                albumData = res.data[0];
              }
            }

            if (albumData && albumData._id) {
              newAlbumMap[albumData._id] = albumData.name || 'Unknown';
            } else if (id) {
              newAlbumMap[id] = 'Unknown';
            }
          });
          setAlbumNameMap(newAlbumMap);
        }
      } else {
        message.error(response.message || 'Lỗi lấy danh sách bài hát');
      }
    } catch (err) {
      console.error('Fetch Error:', err);
      message.error('Lỗi: ' + err.message);
    } finally {
      setDataLoading(false);
    }
  };

  const handleTableChange = (page) => {
    setPagination({ ...pagination, current: page });
    fetchSongs(page, pagination.pageSize, searchKeyword);
  };

  const handleSearchChange = (e) => {
    setSearchKeyword(e.target.value);
  };

  const handleSearch = () => {
    if (searchKeyword.trim()) {
      setPagination({ ...pagination, current: 1 });
      fetchSongs(1, pagination.pageSize, searchKeyword);
    } else {
      message.warning('Vui lòng nhập từ khóa tìm kiếm');
    }
  };

  const handleClearSearch = () => {
    setSearchKeyword('');
    setPagination({ ...pagination, current: 1 });
    fetchSongs(1, pagination.pageSize, '');
  };

  const getLanguageName = (language) => {
    const languageMap = {
      English: 'Tiếng Anh',
      Vietnamese: 'Tiếng Việt',
      Chinese: 'Tiếng Trung',
      Spanish: 'Tiếng Tây Ban Nha',
      French: 'Tiếng Pháp',
    };
    return languageMap[language] || language || '-';
  };

  const columns = [
    {
      title: 'Tên Bài Hát',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Nghệ Sĩ',
      dataIndex: 'artist',
      key: 'artist',
      render: (artist) => {
        if (!artist || !Array.isArray(artist)) return '-';
        return artist.map(id => artistNameMap[id] || 'Unknown').join(', ');
      },
    },
    {
      title: 'Album',
      dataIndex: 'album',
      key: 'album',
      render: (album) => {
        if (!album) return '-';
        if (typeof album === 'object') {
          return album.name || album._id || '-';
        }
        // album is likely an id string
        return albumNameMap[album] || album || '-';
      },
    },
    {
      title: 'Ngôn Ngữ',
      dataIndex: 'language',
      key: 'language',
      render: (language) => getLanguageName(language),
    },
    {
      title: 'Thể Loại',
      dataIndex: 'category',
      key: 'category',
      render: (category) => category || '-',
    },
    // {
    //   title: 'Thời Lượng',
    //   dataIndex: 'duration',
    //   key: 'duration',
    //   render: (duration) => {
    //     if (!duration) return '-';
    //     const minutes = Math.floor(duration / 60);
    //     const seconds = duration % 60;
    //     return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    //   },
    // },
    {
      title: 'Ngày Tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleDateString('vi-VN'),
    },
    {
      title: 'Hành Động',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button icon={<EyeOutlined />} type="default" size="small" onClick={() => showViewModal(record)}>Xem</Button>
          <Button icon={<EditOutlined />} type="primary" size="small" onClick={() => showEditModal(record)}>Sửa</Button>
          <Button icon={<DeleteOutlined />} danger size="small" onClick={() => showDeleteConfirm(record)}>Xóa</Button>
        </Space>
      ),
    },
  ];

  const showModal = () => {
    form.resetFields();
    setSongFile(null);
    setImageFile(null);
    setSongFileList([]);
    setImageFileList([]);
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
    setSongFile(null);
    setImageFile(null);
    setSongFileList([]);
    setImageFileList([]);
  };

  const showEditModal = (song) => {
    setEditingSong(song);
    editForm.setFieldsValue({
      name: song.name,
      artist: Array.isArray(song.artist) ? song.artist[0] : song.artist,
      album: typeof song.album === 'object' && song.album._id ? song.album._id : song.album || '',
      duration: song.duration || '',
      language: song.language || '',
      category: Array.isArray(song.category) ? song.category[0] : song.category,
    });
    setEditSongFile(null);
    setEditImageFile(null);
    setEditSongFileList([]);
    setEditImageFileList([]);
    setIsEditModalOpen(true);
  };

  const handleEditCancel = () => {
    setIsEditModalOpen(false);
    setEditingSong(null);
    editForm.resetFields();
    setEditSongFile(null);
    setEditImageFile(null);
    setEditSongFileList([]);
    setEditImageFileList([]);
  };

  const showViewModal = async (song) => {
    try {
      // If an audio is currently mounted/playing, stop it before loading new song
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        } catch (err) {
          // ignore
        }
      }
      setLoading(true);
      const response = await songAPI.getSongDetail(song._id);
      if (response.success) {
        setViewingSong(response.data);
        
        // Fetch artist details for each artist ID
        if (response.data.artist && Array.isArray(response.data.artist)) {
          const artistDetails = await Promise.all(
            response.data.artist.map(artistId => 
              songAPI.getArtistDetail(artistId).catch(err => {
                console.error('Error fetching artist:', err);
                return { data: { name: 'Unknown' } };
              })
            )
          );
          setViewingArtists(artistDetails.map(art => art.data));
        }
        
        setIsViewModalOpen(true);
      } else {
        message.error(response.message || 'Lỗi lấy thông tin bài hát');
      }
    } catch (err) {
      message.error('Lỗi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewCancel = () => {
    // Stop audio playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsViewModalOpen(false);
    setViewingSong(null);
    setViewingArtists([]);
  };

  const showDeleteConfirm = (song) => {
    Modal.confirm({
      title: 'Xác nhận xóa',
      content: `Bạn chắc chắn muốn xóa bài hát "${song.name}"?`,
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          const response = await songAPI.deleteSong(song._id);
          if (response.success) {
            message.success('Xóa bài hát thành công!');
            
            // Remove song from state immediately
            const updatedSongs = songs.filter(s => s._id !== song._id);
            setSongs(updatedSongs);
            
            // Update pagination total
            setPagination({
              ...pagination,
              total: Math.max(0, pagination.total - 1)
            });
          } else {
            message.error(response.message || 'Lỗi xóa bài hát');
          }
        } catch (err) {
          message.error('Lỗi: ' + err.message);
        }
      },
    });
  };

  const handleEditOk = async () => {
    try {
      setLoading(true);

      const updateData = {};
      const fields = editForm.getFieldsValue(['name', 'artist', 'album', 'duration', 'language', 'category']);
      
      if (fields.name) {
        updateData.name = fields.name;
      }
      if (fields.artist) {
        // Ensure artist is always a string (single ID), not array
        updateData.artist = Array.isArray(fields.artist) ? fields.artist[0] : fields.artist;
      }
      if (fields.album) {
        updateData.album = fields.album;
      }
      if (fields.duration) {
        updateData.duration = fields.duration;
      }
      if (fields.language) {
        updateData.language = fields.language;
      }
      if (fields.category) {
        // Ensure category is always a string (single value), not array
        updateData.category = Array.isArray(fields.category) ? fields.category[0] : fields.category;
      }
      if (editSongFileList && editSongFileList.length > 0) {
        updateData.songFile = editSongFileList[0]?.originFileObj || editSongFileList[0];
      } else if (editSongFile) {
        updateData.songFile = editSongFile;
      }
      if (editImageFileList && editImageFileList.length > 0) {
        updateData.imageFile = editImageFileList[0]?.originFileObj || editImageFileList[0];
      } else if (editImageFile) {
        updateData.imageFile = editImageFile;
      }

      if (Object.keys(updateData).length === 0) {
        message.warning('Vui lòng thay đổi ít nhất một thông tin!');
        setLoading(false);
        return;
      }

      const response = await songAPI.updateSong(editingSong._id, updateData);

      if (response.success) {
        message.success('Sửa bài hát thành công!');
        
        // Update song in state immediately
        const updatedSong = {
          ...editingSong,
          ...response.data
        };
        
        setSongs(songs.map(song => 
          song._id === editingSong._id ? updatedSong : song
        ));
        
        // Update artist name map if artist was changed
        if (response.data.artist) {
          const artistIds = Array.isArray(response.data.artist) 
            ? response.data.artist 
            : [response.data.artist];
          
          // Fetch artist details for updated song
          const newArtistMap = { ...artistNameMap };
          for (const artistId of artistIds) {
            if (!newArtistMap[artistId]) {
              try {
                const artistResponse = await songAPI.getArtistDetail(artistId);
                if (artistResponse.data) {
                  newArtistMap[artistId] = artistResponse.data.name;
                }
              } catch (err) {
                console.error(`Error fetching artist ${artistId}:`, err);
              }
            }
          }
          setArtistNameMap(newArtistMap);
        }
        
        setIsEditModalOpen(false);
        setEditingSong(null);
        editForm.resetFields();
        setEditSongFile(null);
        setEditImageFile(null);
        setEditSongFileList([]);
        setEditImageFileList([]);
      } else {
        message.error(response.message || 'Lỗi sửa bài hát');
      }
    } catch (err) {
      message.error('Lỗi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // Validate required fields
      if (!values.language) {
        message.error('Vui lòng chọn ngôn ngữ!');
        setLoading(false);
        return;
      }
      if (!values.category) {
        message.error('Vui lòng chọn thể loại!');
        setLoading(false);
        return;
      }
      if (!songFileList || songFileList.length === 0) {
        message.error('Vui lòng chọn file MP3!');
        setLoading(false);
        return;
      }
      if (!imageFileList || imageFileList.length === 0) {
        message.error('Vui lòng chọn hình ảnh!');
        setLoading(false);
        return;
      }

      const createData = {
        name: values.name,
        artist: values.artist,
        language: values.language,
        category: values.category,
        songFile: songFileList[0]?.originFileObj || songFileList[0],
        imageFile: imageFileList[0]?.originFileObj || imageFileList[0],
      };

      if (values.album) {
        createData.album = values.album;
      }
      if (values.duration) {
        createData.duration = values.duration;
      }

      const response = await songAPI.createSong(createData);

      if (response.success) {
        message.success('Thêm bài hát thành công!');
        setIsModalOpen(false);
        form.resetFields();
        setSongFile(null);
        setImageFile(null);
        setSongFileList([]);
        setImageFileList([]);
        fetchSongs(1, pagination.pageSize, searchKeyword);
      } else {
        message.error(response.message || 'Lỗi thêm bài hát');
      }
    } catch (err) {
      if (err.errorFields) {
        return;
      }
      message.error('Lỗi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Spin spinning={dataLoading}>
      <div>
        <Card
          style={{ marginBottom: '20px' }}
          title="🎵 Quản Lý Bài Hát"
          extra={
            <Space>
              <Input
                placeholder="Tìm kiếm bài hát..."
                value={searchKeyword}
                onChange={handleSearchChange}
                onPressEnter={handleSearch}
                style={{ width: '250px' }}
              />
              <Button 
                type="primary"
                icon={<SearchOutlined />}
                onClick={handleSearch}
              >
                Tìm kiếm
              </Button>
              {searchKeyword && (
                <Button 
                  icon={<ClearOutlined />}
                  onClick={handleClearSearch}
                >
                  Xóa
                </Button>
              )}
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={showModal}
              >
                Thêm Bài Hát
              </Button>
            </Space>
          }
        >
          <div style={{ maxHeight: '500px', overflow: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="hide-scrollbar">
            <Table 
              columns={columns} 
              dataSource={songs}
              pagination={false}
              rowKey="_id"
              size="small"
            />
          </div>
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
            {pagination.total > 0 && (
              <Pagination
                current={pagination.current}
                pageSize={pagination.pageSize}
                total={pagination.total}
                onChange={handleTableChange}
                showSizeChanger={false}
                style={{ padding: '10px 0' }}
              />
            )}
          </div>
        </Card>

        <Modal
          title="Thêm Bài Hát Mới"
          open={isModalOpen}
          onOk={handleOk}
          onCancel={handleCancel}
          confirmLoading={loading}
          width={900}
        >
          <Form
            form={form}
            layout="vertical"
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Tên Bài Hát"
                  name="name"
                  rules={[{ required: true, message: 'Vui lòng nhập tên bài hát!' }]}
                >
                  <Input placeholder="Tên bài hát" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Nghệ Sĩ"
                  name="artist"
                  rules={[{ required: true, message: 'Vui lòng chọn nghệ sĩ!' }]}
                >
                  <Select
                    placeholder="Chọn nghệ sĩ"
                    options={artists.map(artist => ({ label: artist.name, value: artist._id }))}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  label="Album (Tùy chọn)"
                  name="album"
                >
                  <Select
                    style={{ width: '100%' }}
                    placeholder="Chọn album"
                    allowClear
                    options={albums.map(album => ({ label: album.name, value: album._id }))}
                    notFoundContent={albums.length === 0 ? `Không có album (${albums.length})` : null}
                  />
                </Form.Item>
              </Col>
              {/* <Col span={12}>
                <Form.Item
                  label="Thời Lượng (giây) (Tùy chọn)"
                  name="duration"
                >
                  <InputNumber placeholder="180" min="0" style={{ width: '100%' }} />
                </Form.Item>
              </Col> */}
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Ngôn Ngữ"
                  name="language"
                  rules={[{ required: true, message: 'Vui lòng chọn ngôn ngữ!' }]}
                >
                  <Select
                    placeholder="Chọn ngôn ngữ"
                    options={[
                      { label: 'Tiếng Anh', value: 'English' },
                      { label: 'Tiếng Việt', value: 'Vietnamese' },
                      { label: 'Tiếng Trung', value: 'Chinese' },
                      { label: 'Tiếng Tây Ban Nha', value: 'Spanish' },
                      { label: 'Tiếng Pháp', value: 'French' },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Thể Loại"
                  name="category"
                  rules={[{ required: true, message: 'Vui lòng chọn thể loại!' }]}
                >
                  <Select
                    placeholder="Chọn thể loại"
                    options={[
                      { label: 'Pop', value: 'Pop' },
                      { label: 'Rock', value: 'Rock' },
                      { label: 'Jazz', value: 'Jazz' },
                      { label: 'Classical', value: 'Classical' },
                      { label: 'Hip-Hop', value: 'Hip-Hop' },
                      { label: 'Electronic', value: 'Electronic' },
                      { label: 'Country', value: 'Country' },
                      { label: 'R&B', value: 'R&B' },
                    ]}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>File MP3 (Bắt buộc - Max 100MB)<span style={{ color: 'red' }}>*</span></label>
                  <Upload
                    maxCount={1}
                    beforeUpload={(file) => {
                      const isMP3 = file.type === 'audio/mpeg' || file.type === 'audio/mp3';
                      if (!isMP3) {
                        message.error('Chỉ chấp nhận file MP3!');
                        return false;
                      }
                      
                      const isLt100M = file.size / 1024 / 1024 < 100;
                      if (!isLt100M) {
                        message.error('File phải nhỏ hơn 100MB!');
                        return false;
                      }
                      
                      return false;
                    }}
                    accept=".mp3"
                    fileList={songFileList}
                    onChange={(info) => {
                      setSongFileList(info.fileList);
                      if (info.fileList.length > 0) {
                        const file = info.fileList[0];
                        setSongFile(file.originFileObj || file);
                      } else {
                        setSongFile(null);
                      }
                    }}
                  >
                    <Button icon={<UploadOutlined />}>Chọn MP3</Button>
                  </Upload>
                </div>
              </Col>
              <Col span={12}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Hình Ảnh (Bắt buộc - Max 50MB)<span style={{ color: 'red' }}>*</span></label>
                  <Upload
                    maxCount={1}
                    beforeUpload={(file) => {
                      const isImage = file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp';
                      if (!isImage) {
                        message.error('Chỉ chấp nhận file JPG, PNG hoặc WebP!');
                        return false;
                      }
                      
                      const isLt50M = file.size / 1024 / 1024 < 50;
                      if (!isLt50M) {
                        message.error('Hình ảnh phải nhỏ hơn 50MB!');
                        return false;
                      }
                      
                      return false;
                    }}
                    accept=".jpg,.jpeg,.png,.webp"
                    fileList={imageFileList}
                    onChange={(info) => {
                      setImageFileList(info.fileList);
                      if (info.fileList.length > 0) {
                        const file = info.fileList[0];
                        setImageFile(file.originFileObj || file);
                      } else {
                        setImageFile(null);
                      }
                    }}
                  >
                    <Button icon={<UploadOutlined />}>Chọn ảnh</Button>
                  </Upload>
                </div>
              </Col>
            </Row>
          </Form>
        </Modal>

        <Modal
          title="Sửa Bài Hát"
          open={isEditModalOpen}
          onOk={handleEditOk}
          onCancel={handleEditCancel}
          confirmLoading={loading}
          width={900}
        >
          <Form
            form={editForm}
            layout="vertical"
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Tên Bài Hát"
                  name="name"
                >
                  <Input placeholder="Tên bài hát" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Nghệ Sĩ"
                  name="artist"
                >
                  <Select
                    placeholder="Chọn nghệ sĩ"
                    options={artists.map(artist => ({ label: artist.name, value: artist._id }))}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  label="Album (Tùy chọn)"
                  name="album"
                >
                  <Select
                    style={{ width: '100%' }}
                    placeholder="Chọn album"
                    allowClear
                    options={albums.map(album => ({ label: album.name, value: album._id }))}
                    notFoundContent={albums.length === 0 ? `Không có album (${albums.length})` : null}
                  />
                </Form.Item>
              </Col>
              {/* <Col span={12}>
                <Form.Item
                  label="Thời Lượng (giây) (Tùy chọn)"
                  name="duration"
                >
                  <InputNumber placeholder="180" min="0" style={{ width: '100%' }} />
                </Form.Item>
              </Col> */}
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Ngôn Ngữ (Tùy chọn)"
                  name="language"
                >
                  <Select
                    placeholder="Chọn ngôn ngữ"
                    options={[
                      { label: 'Tiếng Anh', value: 'English' },
                      { label: 'Tiếng Việt', value: 'Vietnamese' },
                      { label: 'Tiếng Trung', value: 'Chinese' },
                      { label: 'Tiếng Tây Ban Nha', value: 'Spanish' },
                      { label: 'Tiếng Pháp', value: 'French' },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Thể Loại (Tùy chọn)"
                  name="category"
                >
                  <Select
                    placeholder="Chọn thể loại"
                    options={[
                      { label: 'Pop', value: 'Pop' },
                      { label: 'Rock', value: 'Rock' },
                      { label: 'Jazz', value: 'Jazz' },
                      { label: 'Classical', value: 'Classical' },
                      { label: 'Hip-Hop', value: 'Hip-Hop' },
                      { label: 'Electronic', value: 'Electronic' },
                      { label: 'Country', value: 'Country' },
                      { label: 'R&B', value: 'R&B' },
                    ]}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>File MP3 (Tùy chọn - Max 100MB)</label>
                  <Upload
                    maxCount={1}
                    beforeUpload={(file) => {
                      const isMP3 = file.type === 'audio/mpeg' || file.type === 'audio/mp3';
                      if (!isMP3) {
                        message.error('Chỉ chấp nhận file MP3!');
                        return false;
                      }
                      
                      const isLt100M = file.size / 1024 / 1024 < 100;
                      if (!isLt100M) {
                        message.error('File phải nhỏ hơn 100MB!');
                        return false;
                      }
                      
                      return false;
                    }}
                    accept=".mp3"
                    fileList={editSongFileList}
                    onChange={(info) => {
                      setEditSongFileList(info.fileList);
                      if (info.fileList.length > 0) {
                        const file = info.fileList[0];
                        setEditSongFile(file.originFileObj || file);
                      } else {
                        setEditSongFile(null);
                      }
                    }}
                  >
                    <Button icon={<UploadOutlined />}>Chọn MP3 mới</Button>
                  </Upload>
                </div>
              </Col>
              <Col span={12}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Hình Ảnh (Tùy chọn - Max 50MB)</label>
                  <Upload
                    maxCount={1}
                    beforeUpload={(file) => {
                      const isImage = file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp';
                      if (!isImage) {
                        message.error('Chỉ chấp nhận file JPG, PNG hoặc WebP!');
                        return false;
                      }
                      
                      const isLt50M = file.size / 1024 / 1024 < 50;
                      if (!isLt50M) {
                        message.error('Hình ảnh phải nhỏ hơn 50MB!');
                        return false;
                      }
                      
                      return false;
                    }}
                    accept=".jpg,.jpeg,.png,.webp"
                    fileList={editImageFileList}
                    onChange={(info) => {
                      setEditImageFileList(info.fileList);
                      if (info.fileList.length > 0) {
                        const file = info.fileList[0];
                        setEditImageFile(file.originFileObj || file);
                      } else {
                        setEditImageFile(null);
                      }
                    }}
                  >
                    <Button icon={<UploadOutlined />}>Chọn ảnh mới</Button>
                  </Upload>
                </div>
              </Col>
            </Row>
          </Form>
        </Modal>

        <Modal
          title="Chi Tiết Bài Hát"
          open={isViewModalOpen}
          onCancel={handleViewCancel}
          footer={[
            <Button key="close" onClick={handleViewCancel}>
              Đóng
            </Button>,
          ]}
          width={700}
        >
          {viewingSong && (
            <div>
              <Row gutter={16} style={{ marginBottom: '20px' }}>
                <Col span={8}>
                  {viewingSong.imageURL && (
                    <img 
                      src={viewingSong.imageURL?.startsWith('http') ? viewingSong.imageURL : `http://localhost:4000${viewingSong.imageURL}`}
                      alt={viewingSong.name}
                      style={{ width: '100%', borderRadius: '8px' }}
                    />
                  )}
                </Col>
                <Col span={16}>
                  <div style={{ marginBottom: '12px' }}>
                    <strong>Tên Bài Hát:</strong> {viewingSong.name}
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <strong>Nghệ Sĩ:</strong> {viewingArtists?.map(a => a.name).join(', ') || '-'}
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <strong>Ngôn Ngữ:</strong> {viewingSong.language || '-'}
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <strong>Thể Loại:</strong> {Array.isArray(viewingSong.category) ? viewingSong.category.join(', ') : viewingSong.category || '-'}
                  </div>
                  {/* <div style={{ marginBottom: '12px' }}>
                    <strong>Thời Lượng:</strong> {
                      viewingSong.duration 
                        ? `${Math.floor(viewingSong.duration / 60)}:${(viewingSong.duration % 60).toString().padStart(2, '0')}`
                        : '-'
                    }
                  </div> */}
                  <div style={{ marginBottom: '12px' }}>
                    <strong>Lượt Phát:</strong> {viewingSong.playCount || 0}
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <strong>Ngày Tạo:</strong> {new Date(viewingSong.createdAt).toLocaleDateString('vi-VN')}
                  </div>
                </Col>
              </Row>
              {viewingSong.songUrl && (
                <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                  <strong>Phát Nhạc:</strong>
                  <audio
                    key={viewingSong._id}
                    ref={audioRef}
                    controls
                    style={{ width: '100%', marginTop: '8px' }}
                  >
                    <source src={viewingSong.songUrl?.startsWith('http') ? viewingSong.songUrl : `http://localhost:4000${viewingSong.songUrl}`} type="audio/mpeg" />
                    Trình duyệt của bạn không hỗ trợ phát nhạc.
                  </audio>
                </div>
              )}
            </div>
          )}
        </Modal>
      </div>
    </Spin>
  );
}
