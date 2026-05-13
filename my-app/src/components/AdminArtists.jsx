import { Table, Button, Space, Modal, Form, Input, Card, message, Upload, Spin, Avatar, Pagination } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { artistAPI } from '../services/api';

export default function AdminArtists() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [artists, setArtists] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [editImageFile, setEditImageFile] = useState(null);
  const [editingArtist, setEditingArtist] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState(''); // Thêm state search
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 5,
    total: 0,
  });

  useEffect(() => {
    fetchArtists(pagination.current, pagination.pageSize, searchKeyword);
  }, []);

  const fetchArtists = async (page = 1, limit = 5, keyword = '') => {
    setDataLoading(true);
    try {
      let response;
      
      // Nếu có keyword, dùng search API, không thì dùng getAll
      if (keyword.trim()) {
        response = await artistAPI.searchArtists(keyword, page, limit);
      } else {
        response = await artistAPI.getArtists(page, limit);
      }
      
      console.log('API Response:', response); // Debug log
      
      if (response.success) {
        // API trả về data: { data: [], pagination: {...} }
        const artistsArray = response.data?.data && Array.isArray(response.data.data)
          ? response.data.data
          : [];
        console.log('Artists Array:', artistsArray); // Debug log
        
        setArtists(artistsArray);
        setPagination({
          current: response.data?.pagination?.page || page,
          pageSize: response.data?.pagination?.limit || limit,
          total: response.data?.pagination?.total || 0,
        });
      } else {
        message.error(response.message || 'Lỗi lấy danh sách nghệ sĩ');
      }
    } catch (err) {
      console.error('Fetch Error:', err); // Debug log
      message.error('Lỗi: ' + err.message);
    } finally {
      setDataLoading(false);
    }
  };

  const handleTableChange = (newPagination) => {
    fetchArtists(newPagination.current, newPagination.pageSize, searchKeyword);
  };

  const handleSearchChange = (e) => {
    setSearchKeyword(e.target.value);
  };

  const handleSearch = () => {
    setPagination({ ...pagination, current: 1 });
    fetchArtists(1, 5, searchKeyword);
  };

  const showDeleteConfirm = (artist) => {
    Modal.confirm({
      title: 'Xác nhận xóa',
      content: `Bạn chắc chắn muốn xóa nghệ sĩ "${artist.name}"? Tất cả bài hát, album và dữ liệu liên quan sẽ bị xóa.`,
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          const response = await artistAPI.deleteArtist(artist._id);
          if (response.success) {
            message.success(`Xóa nghệ sĩ thành công! Đã xóa ${response.data?.songsDeleted || 0} bài hát, ${response.data?.albumsDeleted || 0} album.`);
            
            // Update state
            const updatedArtists = artists.filter(a => a._id !== artist._id);
            setArtists(updatedArtists);
            
            // Update pagination
            let newTotal = Math.max(0, pagination.total - 1);
            let newCurrent = pagination.current;
            const totalPages = Math.ceil(newTotal / pagination.pageSize);
            
            // Nếu đang ở trang cuối và xóa hết, quay lại trang trước
            if (newCurrent > totalPages && newCurrent > 1) {
              newCurrent = totalPages;
            }
            
            setPagination({
              ...pagination,
              current: newCurrent,
              total: newTotal
            });
          } else {
            message.error(response.message || 'Lỗi xóa nghệ sĩ');
          }
        } catch (err) {
          message.error('Lỗi: ' + err.message);
        }
      },
    });
  };

  const columns = [
    {
      title: 'Ảnh',
      dataIndex: 'imageURL',
      key: 'imageURL',
      render: (imageURL) => (
        imageURL ? (
          <Avatar size={48} src={`http://localhost:4000${imageURL}`} />
        ) : (
          <Avatar size={48} style={{ backgroundColor: '#87d068' }}>
            Art
          </Avatar>
        )
      ),
    },
    {
      title: 'Tên Nghệ Sĩ',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Twitter',
      dataIndex: 'twitter',
      key: 'twitter',
      render: (twitter) => twitter || '-',
    },
    {
      title: 'Instagram',
      dataIndex: 'instagram',
      key: 'instagram',
      render: (instagram) => instagram || '-',
    },
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

  const handleCancel = () => {
    setIsModalOpen(false);
    setImageFile(null);
    form.resetFields();
  };

  const showEditModal = (artist) => {
    setEditingArtist(artist);
    editForm.setFieldsValue({
      name: artist.name,
      twitter: artist.twitter || '',
      instagram: artist.instagram || '',
    });
    setEditImageFile(null);
    setIsEditModalOpen(true);
  };

  const handleEditCancel = () => {
    setIsEditModalOpen(false);
    setEditingArtist(null);
    setEditImageFile(null);
    editForm.resetFields();
  };

  const handleEditOk = async () => {
    try {
      setLoading(true);

      const updateData = {};

      // Lấy tất cả field từ form, chỉ append nếu có giá trị
      const fields = editForm.getFieldsValue(['name', 'twitter', 'instagram']);
      
      if (fields.name) {
        updateData.name = fields.name;
      }
      if (fields.twitter) {
        updateData.twitter = fields.twitter;
      }
      if (fields.instagram) {
        updateData.instagram = fields.instagram;
      }
      if (editImageFile) {
        updateData.imageFile = editImageFile;
      }

      // Kiểm tra ít nhất một field được sửa
      if (Object.keys(updateData).length === 0) {
        message.warning('Vui lòng thay đổi ít nhất một thông tin!');
        setLoading(false);
        return;
      }

      const response = await artistAPI.updateArtist(editingArtist._id, updateData);

      if (response.success) {
        message.success('Sửa nghệ sĩ thành công!');
        setIsEditModalOpen(false);
        setEditingArtist(null);
        setEditImageFile(null);
        editForm.resetFields();
        fetchArtists(pagination.current, pagination.pageSize);
      } else {
        message.error(response.message || 'Lỗi sửa nghệ sĩ');
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

      const createData = {
        name: values.name,
      };

      if (values.twitter) {
        createData.twitter = values.twitter;
      }
      if (values.instagram) {
        createData.instagram = values.instagram;
      }
      if (imageFile) {
        createData.imageFile = imageFile;
      }

      const response = await artistAPI.createArtist(createData);

      if (response.success) {
        message.success('Thêm nghệ sĩ thành công!');
        setIsModalOpen(false);
        setImageFile(null);
        form.resetFields();
        fetchArtists(pagination.current, pagination.pageSize);
      } else {
        message.error(response.message || 'Lỗi thêm nghệ sĩ');
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
          title="🎤 Quản Lý Nghệ Sĩ"
          extra={
            <Space>
              <Input
                placeholder="Tìm kiếm nghệ sĩ..."
                value={searchKeyword}
                onChange={handleSearchChange}
                style={{ width: '250px' }}
              />
              <Button 
                type="primary"
                onClick={handleSearch}
              >
                Tìm kiếm
              </Button>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={showModal}
              >
                Thêm Nghệ Sĩ
              </Button>
            </Space>
          }
        >
         

          <div style={{ maxHeight: '500px', overflow: 'auto' }}>
            <Table 
              columns={columns} 
              dataSource={artists}
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
                onChange={(page) => handleTableChange({ ...pagination, current: page })}
                showSizeChanger={false}
                style={{ padding: '10px 0' }}
              />
            )}
          </div>
        </Card>

        <Modal
          title="Thêm Nghệ Sĩ Mới"
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
              label="Tên Nghệ Sĩ"
              name="name"
              rules={[{ required: true, message: 'Vui lòng nhập tên nghệ sĩ!' }]}
            >
              <Input placeholder="The Beatles" />
            </Form.Item>
            <Form.Item
              label="Twitter (Tùy chọn)"
              name="twitter"
            >
              <Input placeholder="@thebeatles" />
            </Form.Item>
            <Form.Item
              label="Instagram (Tùy chọn)"
              name="instagram"
            >
              <Input placeholder="@thebeatles" />
            </Form.Item>
            <Form.Item
              label="Ảnh Đại Diện (Tùy chọn)"
              name="imageFile"
            >
              <Upload
                maxCount={1}
                beforeUpload={(file) => {
                  // Kiểm tra định dạng ảnh
                  const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
                  if (!isJpgOrPng) {
                    message.error('Chỉ chấp nhận file JPG hoặc PNG!');
                    return false;
                  }

                  // Kiểm tra kích thước (50MB)
                  const isLt50M = file.size / 1024 / 1024 < 50;
                  if (!isLt50M) {
                    message.error('Ảnh phải nhỏ hơn 50MB!');
                    return false;
                  }

                  return false; // Ngăn upload tự động, cho phép lưu file vào state
                }}
                accept=".jpg,.jpeg,.png"
                onChange={(info) => {
                  if (info.fileList.length > 0) {
                    const file = info.fileList[0];
                    setImageFile(file.originFileObj || file);
                  } else {
                    setImageFile(null);
                  }
                }}
              >
                <Button icon={<UploadOutlined />}>Chọn ảnh (JPG, PNG - Max 50MB)</Button>
              </Upload>
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title="Sửa Nghệ Sĩ"
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
              label="Tên Nghệ Sĩ"
              name="name"
            >
              <Input placeholder="The Beatles" />
            </Form.Item>
            <Form.Item
              label="Twitter (Tùy chọn)"
              name="twitter"
            >
              <Input placeholder="@thebeatles" />
            </Form.Item>
            <Form.Item
              label="Instagram (Tùy chọn)"
              name="instagram"
            >
              <Input placeholder="@thebeatles" />
            </Form.Item>
            <Form.Item
              label="Ảnh Đại Diện (Tùy chọn)"
              name="imageFile"
            >
              <Upload
                maxCount={1}
                beforeUpload={(file) => {
                  // Kiểm tra định dạng ảnh
                  const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
                  if (!isJpgOrPng) {
                    message.error('Chỉ chấp nhận file JPG hoặc PNG!');
                    return false;
                  }

                  // Kiểm tra kích thước (50MB)
                  const isLt50M = file.size / 1024 / 1024 < 50;
                  if (!isLt50M) {
                    message.error('Ảnh phải nhỏ hơn 50MB!');
                    return false;
                  }

                  return false; // Ngăn upload tự động, cho phép lưu file vào state
                }}
                accept=".jpg,.jpeg,.png"
                onChange={(info) => {
                  if (info.fileList.length > 0) {
                    const file = info.fileList[0];
                    setEditImageFile(file.originFileObj || file);
                  } else {
                    setEditImageFile(null);
                  }
                }}
              >
                <Button icon={<UploadOutlined />}>Chọn ảnh mới (JPG, PNG - Max 50MB)</Button>
              </Upload>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </Spin>
  );
}
