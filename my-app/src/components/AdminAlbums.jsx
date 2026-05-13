import { Table, Button, Space, Modal, Form, Input, Card, message, Select, Spin, Upload, Pagination, Row, Col } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { albumAPI, songAPI } from '../services/api';

export default function AdminAlbums() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [albums, setAlbums] = useState([]);
  const [artists, setArtists] = useState([]);
  const [artistNameMap, setArtistNameMap] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [editingAlbum, setEditingAlbum] = useState(null);
  const [editImageFile, setEditImageFile] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 6,
    total: 0,
  });

  useEffect(() => {
    fetchArtists();
    fetchAlbums(pagination.current, pagination.pageSize);
  }, []);

  const fetchArtists = async () => {
    try {
      const response = await songAPI.getArtistsForSelect();
      if (response.success) {
        setArtists(response.data?.artists || []);
      }
    } catch (err) {
      console.error('Fetch artists error:', err);
    }
  };

  const fetchAlbums = async (page = 1, limit = 6) => {
    setDataLoading(true);
    try {
      const response = await albumAPI.getAlbums(page, limit);
      if (response.success) {
        const albumsArray = response.data?.albums && Array.isArray(response.data.albums)
          ? response.data.albums
          : response.data && Array.isArray(response.data)
          ? response.data
          : [];
        
        setAlbums(albumsArray);
        setPagination({
          current: response.data?.pagination?.page || page,
          pageSize: response.data?.pagination?.limit || limit,
          total: response.data?.pagination?.total || 0,
        });
        
        // Build artist name map
        const map = {};
        albumsArray.forEach(album => {
          if (album.artist && album.artist._id) {
            map[album.artist._id] = album.artist.name || album.artist;
          } else if (album.artist) {
            map[album.artist] = album.artist;
          }
        });
        setArtistNameMap(map);
      }
    } catch (err) {
      console.error('Fetch albums error:', err);
    } finally {
      setDataLoading(false);
    }
  };

  const columns = [
    {
      title: 'Tên Album',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Nghệ Sĩ',
      dataIndex: 'artist',
      key: 'artist',
      render: (artist) => {
        if (!artist) return '-';
        if (typeof artist === 'object' && artist.name) {
          return artist.name;
        }
        return artistNameMap[artist] || artist || '-';
      },
    },
    {
      title: 'Ngày Tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => date ? new Date(date).toLocaleDateString('vi-VN') : '-',
    },
    {
      title: 'Hành Động',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} type="primary" size="small" onClick={() => showEditModal(record)}>Sửa</Button>
          <Button icon={<DeleteOutlined />} danger size="small" onClick={() => showDeleteConfirm(record)}>Xóa</Button>
        </Space>
      ),
    },
  ];

  const showModal = () => {
    form.resetFields();
    setImageFile(null);
    setIsModalOpen(true);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const createData = {
        name: values.name,
        artist: values.artist,
      };
      
      if (imageFile) {
        createData.imageFile = imageFile;
      }

      const response = await albumAPI.createAlbum(createData);

      if (response.success) {
        message.success('Thêm album thành công!');
        setIsModalOpen(false);
        form.resetFields();
        setImageFile(null);
        fetchAlbums(1, pagination.pageSize);
      } else {
        message.error(response.message || 'Lỗi thêm album');
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

  const handleTableChange = (page) => {
    setPagination({ ...pagination, current: page });
    fetchAlbums(page, pagination.pageSize);
  };

  const showDeleteConfirm = (album) => {
    Modal.confirm({
      title: 'Xác nhận xóa',
      content: `Bạn chắc chắn muốn xóa album "${album.name}"?`,
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          const response = await albumAPI.deleteAlbum(album._id);
          if (response.success) {
            message.success('Xóa album thành công!');
            const updatedAlbums = albums.filter(a => a._id !== album._id);
            setAlbums(updatedAlbums);
            setPagination({
              ...pagination,
              total: Math.max(0, pagination.total - 1)
            });
          } else {
            message.error(response.message || 'Lỗi xóa album');
          }
        } catch (err) {
          message.error('Lỗi: ' + err.message);
        }
      },
    });
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
    setImageFile(null);
  };

  const showEditModal = (album) => {
    setEditingAlbum(album);
    editForm.setFieldsValue({
      name: album.name,
      artist: typeof album.artist === 'object' ? album.artist._id : album.artist,
    });
    setEditImageFile(null);
    setIsEditModalOpen(true);
  };

  const handleEditOk = async () => {
    try {
      const values = await editForm.validateFields();
      setLoading(true);

      const updateData = {};
      if (values.name) {
        updateData.name = values.name;
      }
      if (values.artist) {
        updateData.artist = values.artist;
      }
      if (editImageFile) {
        updateData.imageFile = editImageFile;
      }

      if (Object.keys(updateData).length === 0) {
        message.warning('Vui lòng thay đổi ít nhất một thông tin!');
        setLoading(false);
        return;
      }

      const response = await albumAPI.updateAlbum(editingAlbum._id, updateData);

      if (response.success) {
        message.success('Sửa album thành công!');
        
        // Update album in state immediately
        const updatedAlbum = {
          ...editingAlbum,
          ...response.data
        };
        
        const updatedAlbums = albums.map(album => 
          album._id === editingAlbum._id ? updatedAlbum : album
        );
        setAlbums(updatedAlbums);
        
        // Fetch artist names for all unique artist IDs
        const uniqueArtistIds = new Set();
        updatedAlbums.forEach(album => {
          if (album.artist) {
            // Handle both object format and ObjectId string format
            const artistId = typeof album.artist === 'object' ? album.artist._id : album.artist;
            if (artistId) {
              uniqueArtistIds.add(artistId);
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
          
          Promise.all(artistDetailsPromises).then(artistDetailsResults => {
            const newArtistMap = {};
            artistDetailsResults.forEach(result => {
              if (result.data) {
                newArtistMap[result.data._id] = result.data.name;
              }
            });
            setArtistNameMap(newArtistMap);
          });
        }
        
        setIsEditModalOpen(false);
        setEditingAlbum(null);
        editForm.resetFields();
        setEditImageFile(null);
      } else {
        message.error(response.message || 'Lỗi sửa album');
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

  const handleEditCancel = () => {
    setIsEditModalOpen(false);
    setEditingAlbum(null);
    editForm.resetFields();
    setEditImageFile(null);
  };

  return (
    <Spin spinning={dataLoading}>
      <div>
        <Card
          style={{ marginBottom: '20px' }}
          title="💿 Quản Lý Albums"
          extra={
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={showModal}
            >
              Thêm Album
            </Button>
          }
        >
          <div style={{ maxHeight: '500px', overflow: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <Table 
              columns={columns} 
              dataSource={albums}
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
          title="Thêm Album Mới"
          open={isModalOpen}
          onOk={handleOk}
          onCancel={handleCancel}
          confirmLoading={loading}
        >
          <Form
            form={form}
            layout="vertical"
          >
            <Form.Item
              label="Tên Album"
              name="name"
              rules={[{ required: true, message: 'Vui lòng nhập tên album!' }]}
            >
              <Input placeholder="Tên album" />
            </Form.Item>
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
            {/* <Form.Item
              label="Hình Ảnh (Tùy chọn - Max 50MB)"
            >
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
                onChange={(info) => {
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
            </Form.Item> */}
          </Form>
        </Modal>

        <Modal
          title="Sửa Album"
          open={isEditModalOpen}
          onOk={handleEditOk}
          onCancel={handleEditCancel}
          confirmLoading={loading}
        >
          <Form
            form={editForm}
            layout="vertical"
          >
            <Form.Item
              label="Tên Album"
              name="name"
            >
              <Input placeholder="Tên album" />
            </Form.Item>
            <Form.Item
              label="Nghệ Sĩ"
              name="artist"
            >
              <Select
                placeholder="Chọn nghệ sĩ"
                options={artists.map(artist => ({ label: artist.name, value: artist._id }))}
              />
            </Form.Item>
            {/* <Form.Item
              label="Hình Ảnh (Tùy chọn - Max 50MB)"
            >
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
                onChange={(info) => {
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
            </Form.Item> */}
          </Form>
        </Modal>
      </div>
    </Spin>
  );
}
